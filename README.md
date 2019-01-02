# Codeflex

A framework for the NPM package FFI:
https://www.npmjs.com/package/ffi

Dynamically compile VB.NET and C#.NET code from javascript using Node.JS, Compile entire directories of VB/C# code.

## Why use Codeflex?

Code flex is a really useful tool that allows us to run C#/VB code in a Node JS environment. Codeflex can be used to compile entire directories of source code and reference the instances of the source code as a dynamic link library (dll).

Code flex can also be used to compile source code written inline with javascript. Making it easy to switch between languages eliminating the need to re-write existing c# or vb code.

## Requirements

1. Windows based operating system
2. .NET Framework 2.0

### Compile .vb files from a directory

The code below will locate all .vb files in the specified directory (recursively). If the code compiles, the result will return a assemblyId in the callback function. This assemblyId is used to access this compiled assembly.

```javascript
var flex = require("codeflex");

flex.compileDirectory("vb","./directory/containing/vb/files/",function(err, assemblyId){
    if(err){
        //Something went wrong.
        console.log('Error compiling directory');
        console.log(err);
        return;
    }
    console.log("The code was compiled into an in-memory assembly. You can access this assembly using the assemblyId");
    console.log(assemblyId);
});

```

### Compile c# files from a directory

To compile source files in c# instead of vb. Use the code above and set the first parameter (language parameter) of flex.compileDirectory() to 'c#'
```javascript
var flex = require("codeflex");

flex.compileDirectory("c#","./directory/containing/c/files/",function(err, assemblyId){

});
```

### Compiling source code as inline code

You don't have to compile code from source files, you can instead provide code to compile as a string and use it in the same way.

The code must be supplied in the form of a function with the VB or C# code commented out using ```/* code here */```

```javascript
var flex = require("codeflex");

flex.compileCode("vb",function(){
/*
namespace MyNamespace

public class VBTestCode

    public function SayHello(Name as string) as String
        return "Hello, " & Name 
    end function

end class

end namespace
*/
},function(err,assemblyId){
    if(err){
        //Something went wrong
        console.log(err);
        return;
    }
    console.log(assemblyId);
});
```

### Create an instance of an object compiled from source code

Here is an example of how to compile code and create an instance of an object specified within that code.
Once a instance is created, the instance can be referenced with it's instanceId. This is needed for calling methods in the instance. (Mentioned later in this article.)

```javascript
var flex = require("codeflex");

flex.compileCode("vb",function(){
/*
namespace MyNamespace

public class VBTestCode

    public function SayHello(Name as string) as String
        return "Hello, " & Name 
    end function

end class

end namespace
*/
},function(err,assemblyId){
    if(err){
        //Something went wrong
        console.log(err);
        return;
    }

    //The code was compiled and the compiler returned an assemblyId for us to reference it with.
    flex.createInstance(assemblyId, "MyNamespace.VBTestCode",function(err, instanceId){
        if(err){
            //Something went wrong. could not create instance
            console.log(err);
            return;
        }
        //Instance created! We can now reference this instance using the returned instanceId.
        console.log(instanceId);
    });
});
```

### Compile code, create an instance, call a method

Now we have our assemblyId and instanceId, we can finally call a method within that instance directly from javascript.

1. The first parameter of .executeMethod is the assemblyId.. we obtain this by compiling the code. (Read above)
2. The second parameter is the instanceId.. we obtain this by creating an instance of an object from the compiled the code. (Read above)
3. The third parameter is the list of variables to send to the method.
4. The forth parameter is the call back function that raises when the method returns.

```javascript
  flex.executeMethod(assemblyId,instanceId,"SayHello",{"PersonName":"Phil"},function(err, result){
            if(err){
                //Something went wrong. The method invocation failed.
                console.log(err);
                return;
            }
            console.log("The method completed execution and returned the result:");
            console.log(result);
   });
```

### Putting it all together, compile, instance, execute

Here is a complete example of how to compile some code, create an instance of an object in the compiled code and execute one of it's methods.

This example uses inline vb code, you could also load the code from a directory of source files, either VB or C# files. (.vb / .cs). Use ``` flex.compileDirectory ``` instead of ``` flex.compileCode ```

```javascript
var flex = require("codeflex");

flex.compileCode("vb",function(){
/*
namespace MyNamespace

public class VBTestCode

    public function SayHello(Name as string) as String
        return "Hello, " & Name 
    end function

end class

end namespace
*/
},function(err,assemblyId){
    if(err){
        //Something went wrong
        console.log(err);
        return;
    }

    //The code was compiled and the compiler returned an assemblyId for us to reference it with.
    flex.createInstance(assemblyId, "MyNamespace.VBTestCode",function(err, instanceId){
        if(err){
            //Something went wrong. could not create instance
            console.log(err);
            return;
        }

        //Instance created! We can now reference this instance using the returned instanceId.
        console.log(instanceId);

        flex.executeMethod(assemblyId,instanceId,"SayHello",{"PersonName":"Phil"},function(err, result){
            if(err){
                //Something went wrong. The method invocation failed.
                console.log(err);
                return;
            }
            console.log("The method completed execution and returned the result:");
            console.log(result);// The result should be: 'Hello, Phil'
        });
    });
});

```

## Adding .NET Assembly References

You can include additional references to the .NET framework assemblies by adding @import at the top of the code to be compiled.

Visual Basic:
```vb
'@import(System.Drawing.dll)
```

C#
```csharp
//@import(System.Drawing.dll)
```