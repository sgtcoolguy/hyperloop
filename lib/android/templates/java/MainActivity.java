package <%- MainActivityPackage %>;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

import com.appcelerator.javascriptcore.JSVirtualMachine;
import com.appcelerator.javascriptcore.JavaScriptCoreLibrary;
import com.appcelerator.javascriptcore.opaquetypes.JSContextRef;
import com.appcelerator.javascriptcore.opaquetypes.JSObjectRef;
import com.appcelerator.javascriptcore.opaquetypes.JSValueArrayRef;
import com.appcelerator.javascriptcore.opaquetypes.JSValueRef;

import com.appcelerator.hyperloop.Hyperloop;

public class <%- MainActivityName %> extends Activity {

    protected JavaScriptCoreLibrary jsc = JavaScriptCoreLibrary.getInstance();
    protected JSVirtualMachine vm = new JSVirtualMachine();
    
    public JSContextRef getJSContext() {
        return vm.getDefaultContext();
    }

    /** Called when the activity is first created. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        long start = System.currentTimeMillis();
        
        try {
            JSContextRef context = vm.getDefaultContext();
            JSObjectRef globalObject = jsc.JSContextGetGlobalObject(context);

            /* Initialize JS classes */
<% for (var i = 0; i < jsclass_includes.length; i++) { var jsclass = jsclass_includes[i]; %>
            JSObjectRef parentObject<%- i %> = Hyperloop.registerJSNamespace(context, globalObject, generated.<%- jsclass %>.getNamespace());
            generated.<%- jsclass %>.registerClass(context, parentObject<%- i %>);
<% }; %>

            JSValueRef exception = JSValueRef.Null();
            context.evaluateScript(getScript(), globalObject, exception);
            Hyperloop.checkJSException(context, exception);

        } catch (Exception e) {
            new AlertDialog.Builder(this).setTitle("OnCreate Error").setMessage(e.getMessage()).setNeutralButton("Close", null).show();
        }
        
        android.util.Log.d("JavaScriptCore", String.format("onCreate is done by %d msec", (System.currentTimeMillis() - start)));
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        
        /*
         * JSVirtualMachine should be released *before* unloading JS class definition.
         * This releases global JavaScript context which also invokes finalize callback for the JS objects.
         */
        vm.release();
        vm = null;
        
        /* 
         * Cleanup JS classes: this is needed to release native memory otherwise memory leaks.
         */
<% for (var i = 0; i < jsclass_includes.length; i++) { var jsclass = jsclass_includes[i]; %>
        generated.<%- jsclass %>.getJSClass().getDefinition().dispose();
<% }; %>
    }

    /*
     * TODO: obfuscate script string
     */
    protected String getScript() {
        return "<%- hl_app_code %>";
    }
}
