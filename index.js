var ffi = require('ffi');
var fs = require('fs');
var path = require('path');

var arch = process.arch;

if(arch=="ia32"){arch = "x86";}


var asarMode = __dirname.indexOf("app.asar")>-1;
var dllPath = `${__dirname}\\dll\\bin\\${arch}\\codeflex.dll`;
var jsonDllPath = `${__dirname}\\dll\\bin\\${arch}\\Newtonsoft.Json.dll`;


if(asarMode){
    if(fs.existsSync('codeflex')==false){
        fs.mkdirSync('codeflex');
    }

    var copyPath = 'codeflex\\codeflex.dll'; 
    if(fs.existsSync(copyPath)!=true){
        fs.copyFileSync(dllPath,copyPath,fs.constants.COPYFILE_EXCL);
    }
    
    dllPath = copyPath;

    var copyPath = 'codeflex\\Newtonsoft.Json.dll'; 
    if(fs.existsSync(copyPath)!=true){
        fs.copyFileSync(jsonDllPath,copyPath,fs.constants.COPYFILE_EXCL);
    }
}
 
var libm = ffi.Library(dllPath, {
    'loadAssemblies':['void',[]],
    'compileCode': ['String',['String']],
    'createInstance':['String',['String','String']],
    'executeMethod':['String',['String','String','String','String']]
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

        if(dir.endsWith("\\")){
            dir = dir.toString().substring(0,dir.length-1);
        }
       
        try{
            files = fs.readdirSync(dir);
        }catch(ex){
            console.log(ex);
            files = [];
        }
 
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
    compileCode:function(language, statement, callBackFn){

        var callBack = function(err,result){
            setTimeout(function(){
                callBackFn(err,result);
            },1);
        };

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

                res = JSON.parse(res);

                if(res.error){
                    callBack(res.error, null);
                    return;
                }
                
                libm.compileCode.async(JSON.stringify(config), function (err, res) {
                    if(err){
                        callBack(err,res);
                        return;
                    }
                    res = JSON.parse(res);
                    callBack(res.error, res.result);
                });
            });     
        }catch(ex){
            console.log(ex);
            callBack(ex, null);
        }
    },
    compileDirectory:function(language, directory, callBackFn){
        
        var callBack = function(err,result){
            setTimeout(function(){
                callBackFn(err,result);
            },1);
        };

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
                if(config.code.length==0){
                    callBack(new Error("No code to compile"),null);
                    return;
                }

             
                libm.loadAssemblies.async(function (err, res) {
                   
                    if(err){
                        callBack(err,res);
                        return;
                    }
 
                    libm.compileCode.async(JSON.stringify(config), function (err, res) {
                        if(err){
                            callBack(err,res);
                            return;
                        }
                        res = JSON.parse(res);
                        callBack(res.error, res.result);
                    });
                });
 
            }catch(ex){
                console.log(ex);
                callBack(ex, null);
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
    createInstance:function(assemblyId, instanceType, callBackFn){
        var callBack = function(err,result){
            setTimeout(function(){
                callBackFn(err,result);
            },1);
        };

        try{
            libm.loadAssemblies.async(function (err, res) {
                if(err){
                    callBack(err,res);
                    return;
                }
  
                libm.createInstance.async(assemblyId, instanceType,function (err, res) {
                    if(err){
                        callBack(err,res);
                        return;
                    }

                    res = JSON.parse(res);

                    if(res.error){
                        callBack(res.error, null);
                        return;
                    }

                    callBack(res.error,res.result);
                });
            });
        }catch(ex){
            callBack(ex,null);
        }
    },
    executeMethod(assemblyId, instanceId, method, params, callBackFn){
        
        var callBack = function(err,result){
            setTimeout(function(){
                callBackFn(err,result);
            },1);
        };

        try{
            params = JSON.stringify(params);
            libm.loadAssemblies.async(function (err, res) {
                if(err){
                    callBack(err,res);
                    return;
                }
  
                libm.executeMethod.async(assemblyId, instanceId,method, params,function (err, res) {
                 
                    if(err){
                        callBack(err,res);
                        return;
                    }
             
                    res = JSON.parse(res);

                    if(res.error){
                        callBack(res.error, null);
                        return;
                    }

                    callBack(res.error, res.result);
                });
            });
        }catch(ex){
            callBack(ex,null);
        }
    }
};

