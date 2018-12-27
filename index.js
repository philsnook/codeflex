var ffi = require('ffi');
var fs = require('fs');
var path = require('path');

var libm = ffi.Library(`${__dirname}/dll/bin/${process.arch}/codeflex.dll`, {
    'loadAssemblies':['void',[]],
    'compileCode': ['String',['String']],
    'createInstance':['String',['String','String']],
    'executeMethod':['String',['String','String','String','String']],
});

var utility ={
    reverseString:function(str) {
        var newString = "";
        for (var i = str.length - 1; i >= 0; i--) {
            newString += str[i];
        }
        return newString;
    },getFiles:function(dir, extension, files_){
        files_ = files_ || [];
        var files;
        files = fs.readdirSync(dir);
        for (var i in files){
            var name = path.join(dir, files[i]);
            if (fs.statSync(name).isDirectory()){
                utility.getFiles(name, extension, files_);
            } else {
                if(path.extname(name).toString().toLowerCase()==extension.toString().toLowerCase()){
                    files_.push(name);
                }
            }
        }
        return files_;
    }
};

module.exports = {
    compileCode:function(language, statement, callBack){
        
        var config ={
            language: (language || "vb").toString().toLowerCase(),
            code:[]
        };

        if(config.language!="vb" && config.language!="c#"){
            callBack(new Error("Unsupported language. The language parameter must be 'vb' or 'c#'"), null);
            return;
        }

        statement = statement.toString();
        statement = statement.substring(statement.indexOf("*")+1);
        statement = utility.reverseString(statement);
        statement = statement.substring(statement.indexOf("*")+1);
        statement = utility.reverseString(statement);
     
        config.code.push(statement);

        try{

            libm.loadAssemblies.async(function (err, res) {
                if(err){
                    callBack(err,res);
                    return;
                }
                libm.compileCode.async(JSON.stringify(config), function (err, res) {
                    callBack(err, res);
                });
            });
          
        }catch(ex){
            callBack(ex, null);
        }
    },
    compileDirectory:function(language, directory, callBack){
 
        var config ={
            language: (language || "vb").toString().toLowerCase(),
            code:[]
        };

        var extension;

        if(config.language=="vb"){
            extension= ".vb";
        }else if(config.language=="c#"){
            extension = ".cs";
        }else{
            callBack(new Error("Unsupported language. The language parameter must be 'vb' or 'c#'"), null);
            return;
        }

        var compileSources = function(){
            try{
                            
                libm.loadAssemblies.async(function (err, res) {
                    if(err){
                        callBack(err,res);
                        return;
                    }
                    libm.compileCode.async(JSON.stringify(config), function (err, res) {
                        callBack(err,res);
                    });
                });

            }catch(ex){
                callBack(ex,null);
            }
        };

        files = utility.getFiles(directory,extension);
      
        var addSourceFromNextFile = function(){
            var filename = files[0];
            if(filename==null){
                compileSources();
                return;
            }
            files.splice(0,1);

            fs.readFile(filename, 'utf8', function(err, statement) {
                if(err){
                    callBack(err,null);
                    return;
                }
                config.code.push(statement);
                addSourceFromNextFile();
            });
        };

        addSourceFromNextFile();
    },
    createInstance:function(assemblyId, instanceType, callBack){
        try{
            libm.loadAssemblies.async(function (err, res) {
                if(err){
                    callBack(err,res);
                    return;
                }
                libm.createInstance.async(assemblyId, instanceType,function (err, res) {
                    callBack(err,res);
                });
            });
        }catch(ex){
            callBack(ex,null);
        }
    },
    executeMethod(assemblyId, instanceId, method, params, callBack){
        try{
            params = JSON.stringify(params);
            libm.loadAssemblies.async(function (err, res) {
                if(err){
                    callBack(err,res);
                    return;
                }
                libm.executeMethod.async(assemblyId, instanceId,method,params,function (err, res) {
                    callBack(err,res);
                });
            });
        }catch(ex){
            callBack(ex,null);
        }
    }
};

