Imports System.CodeDom.Compiler
Imports System.Reflection
Imports Microsoft.CSharp
Imports Newtonsoft.Json.Linq
Imports RGiesecke.DllExport

Public Class EntryPoint
    Private Shared LoadedAssemblies As New Dictionary(Of String, Assembly)
    Private Shared Instances As New Dictionary(Of String, Object)
    Private Shared CompiledAssemblies As New Dictionary(Of String, Assembly)

    Private Shared Function ResolveEventHandler(sender As Object, args As ResolveEventArgs) As Assembly
        Return LoadedAssemblies(args.Name)
    End Function

    <DllExport(ExportName:="loadAssemblies", CallingConvention:=Runtime.InteropServices.CallingConvention.StdCall)>
    Public Shared Sub loadAssemblies()
        Try
            Dim currentAssemblyPath = Assembly.GetExecutingAssembly().Location.ToString().ToLower()
            Dim workingDirectory = IO.Path.GetDirectoryName(currentAssemblyPath)

            For Each File In IO.Directory.GetFiles(workingDirectory, "*.dll")
                If Not LCase(File) = LCase(currentAssemblyPath) Then
                    Try
                        Dim Asm = Assembly.LoadFile(File)
                        If Not LoadedAssemblies.ContainsKey(Asm.FullName) Then
                            LoadedAssemblies.Add(Asm.FullName, Asm)
                        End If
                    Catch ex As Exception
                        Microsoft.VisualBasic.MsgBox(ex.Message,, "codeflex: " & IO.Path.GetFileName(File))
                    End Try

                End If
            Next

            RemoveHandler AppDomain.CurrentDomain.AssemblyResolve, AddressOf ResolveEventHandler
            AddHandler AppDomain.CurrentDomain.AssemblyResolve, AddressOf ResolveEventHandler
        Catch ex As Exception
        End Try
    End Sub




    <DllExport(ExportName:="compileCode", CallingConvention:=Runtime.InteropServices.CallingConvention.StdCall)>
    Public Shared Function compileCode(config As String) As String
        Dim AssmID As String
        Dim ResultObj As New JObject

        Try
            Dim ParamObj As JObject
            Dim CodeArray As JArray
            Dim language As String

            ParamObj = JObject.Parse(config)

            language = ParamObj.Value(Of String)("language")
            CodeArray = ParamObj.Value(Of JArray)("code")

            Dim CodeFiles As New List(Of String)

            For Each P In CodeArray
                CodeFiles.Add(P.ToString())
            Next

            Dim codeProvider As Object

            Select Case language
                Case "vb"
                    codeProvider = New VBCodeProvider()
                Case Else
                    codeProvider = New CSharpCodeProvider()
            End Select


            Dim oCParams As New CompilerParameters
            Dim parameters As New CompilerParameters()
            Dim results As CompilerResults

            Dim ImportList As New List(Of String)
            Dim Pos As Integer
            Dim Keyword As String = "@import("

            For Each Content In CodeFiles
                Dim Lines = Replace(Content, Chr(10), String.Empty)
                For Each Line In Lines.Split(Chr(34))
                    Pos = Line.IndexOf(Keyword)
                    If Pos > -1 Then
                        Line = Mid(Line, Pos + Keyword.Length + 1)
                        Pos = Line.IndexOf(")")
                        If Pos > -1 Then
                            Line = Mid(Line, 1, Pos)
                            ImportList.Add(Line)
                        End If
                    End If
                Next
            Next


            For Each Ref In ImportList
                oCParams.ReferencedAssemblies.Add(Ref)
            Next

            parameters.GenerateExecutable = False

            Select Case language
                Case "vb"
                    results = CType(codeProvider, VBCodeProvider).CompileAssemblyFromSource(oCParams, CodeFiles.ToArray)

                Case Else
                    results = CType(codeProvider, CSharpCodeProvider).CompileAssemblyFromSource(oCParams, CodeFiles.ToArray)
            End Select


            If results.Errors.Count > 0 Then
                'There were compiler errors
                Dim Err As String = ""
                Dim CompErr As CompilerError
                For Each CompErr In results.Errors
                    Err = Err &
                    "Line number " & CompErr.Line &
                    ", Error Number: " & CompErr.ErrorNumber &
                    ", '" & CompErr.ErrorText & ";" &
                    Environment.NewLine & Environment.NewLine
                Next
                Throw New Exception(Err)
            End If

            AssmID = Guid.NewGuid.ToString

            CompiledAssemblies.Add(AssmID, results.CompiledAssembly)

            ResultObj("result") = AssmID
            ResultObj("error") = Nothing
        Catch ex As Exception
            ResultObj("result") = String.Empty
            ResultObj("error") = ex.Message
        End Try
        Return ResultObj.ToString
    End Function


    <DllExport(ExportName:="createInstance", CallingConvention:=Runtime.InteropServices.CallingConvention.StdCall)>
    Public Shared Function createInstance(assemblyId As String, instanceType As String) As String
        Dim ResultObj As New JObject

        Try
            Dim CompiledAssembly = CompiledAssemblies(assemblyId)

            If (IsNothing(CompiledAssembly)) Then
                Throw New Exception(assemblyId & " assemblyId is invalid")
            End If

            Dim instance = CompiledAssembly.CreateInstance(instanceType)

            If (IsNothing(instance)) Then
                Throw New Exception(instanceType & " type was not found.")
            End If
            Dim instanceId = Guid.NewGuid.ToString

            Instances.Add(instanceId, instance)

            ResultObj("result") = instanceId
            ResultObj("error") = Nothing
        Catch ex As Exception
            ResultObj("result") = String.Empty
            ResultObj("error") = ex.Message
        End Try
        Return ResultObj.ToString
    End Function

    <DllExport(ExportName:="executeMethod", CallingConvention:=Runtime.InteropServices.CallingConvention.StdCall)>
    Public Shared Function executeMethod(assemblyId As String, instanceId As String, method As String, params As String) As String
        Dim ResultObj As New JObject
        Try
            Dim CompiledAssembly = CompiledAssemblies(assemblyId)

            If (IsNothing(CompiledAssembly)) Then
                Throw New Exception(assemblyId & " assemblyId is invalid")
            End If

            Dim instance = Instances(instanceId)

            If (IsNothing(instance)) Then
                Throw New Exception(instanceId & " instanceId is invalid")
            End If

            Dim oType = instance.GetType
            Dim oMethodInfo = oType.GetMethod(method)

            If (IsNothing(oMethodInfo)) Then
                Throw New Exception(method & " method was not found.")
            End If

            Dim ParamObj As JObject = JObject.Parse(params)
            Dim Items As New List(Of Object)

            For Each P In ParamObj
                Items.Add(P.Value.ToObject(Of Object))
            Next

            Dim oRetObj As Object = oMethodInfo.Invoke(instance, Items.ToArray)

            If IsNothing(oRetObj) Then
                ResultObj("result") = Nothing
            Else
                ResultObj("result") = JToken.FromObject(oRetObj)
            End If

            ResultObj("error") = Nothing
        Catch ex As Exception
            ResultObj("result") = String.Empty

            If IsNothing(ex.InnerException) = False Then
                ResultObj("error") = ex.InnerException.Message
            Else
                ResultObj("error") = ex.Message
            End If

        End Try
        Return ResultObj.ToString
    End Function

End Class
