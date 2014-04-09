package com.appcelerator.hyperloop;

import java.io.StringWriter;
import java.io.PrintWriter;

import com.appcelerator.javascriptcore.JavaScriptCoreLibrary;
import com.appcelerator.javascriptcore.JavaScriptException;
import com.appcelerator.javascriptcore.enums.JSPropertyAttribute;
import com.appcelerator.javascriptcore.opaquetypes.JSClassDefinition;
import com.appcelerator.javascriptcore.opaquetypes.JSClassRef;
import com.appcelerator.javascriptcore.opaquetypes.JSContextRef;
import com.appcelerator.javascriptcore.opaquetypes.JSObjectRef;
import com.appcelerator.javascriptcore.opaquetypes.JSStaticFunctions;
import com.appcelerator.javascriptcore.opaquetypes.JSValueArrayRef;
import com.appcelerator.javascriptcore.opaquetypes.JSValueRef;
import com.appcelerator.javascriptcore.opaquetypes.Pointer;

public class Hyperloop {

    private static JavaScriptCoreLibrary jsc = JavaScriptCoreLibrary.getInstance();

    public static String JSValueRefToString(JSContextRef ctx, JSValueRef jsValue, Pointer exception) {
        JSValueRef checker = JSValueRef.Null();
        String value = jsc.JSValueToStringCopy(ctx, jsValue, checker);
        if (!jsc.JSValueIsNull(ctx, checker)) {
            exception.update(checker.toObject());
        }
        return value;
    }

    public static Object JSValueRefToObject(JSContextRef ctx, JSValueRef jsValue, Pointer exception) {
        JSValueRef checker = JSValueRef.Null();
        JSObjectRef jsObj = jsc.JSValueToObject(ctx, jsValue, checker);
        if (!jsc.JSValueIsNull(ctx, checker)) {
            exception.update(checker.toObject());
        }
        return jsc.JSObjectGetPrivate(jsObj);
    }

    public static JSValueRef intToJSValueRef(JSContextRef ctx, int value) {
        return jsc.JSValueMakeNumber(ctx, value);
    }

    public static JSValueRef doubleToJSValueRef(JSContextRef ctx, double value) {
        return jsc.JSValueMakeNumber(ctx, value);
    }

    public static int intFromJSValueRef(JSContextRef ctx, JSValueRef jsValue, Pointer exception) {
        JSValueRef checker = JSValueRef.Null();
        int value = (int)jsc.JSValueToNumber(ctx, jsValue, checker);
        if (!jsc.JSValueIsNull(ctx, checker)) {
            exception.update(checker.toObject());
        }
        return value;
    }

    public static double doubleFromJSValueRef(JSContextRef ctx, JSValueRef jsValue, Pointer exception) {
        JSValueRef checker = JSValueRef.Null();
        double value = jsc.JSValueToNumber(ctx, jsValue, checker);
        if (!jsc.JSValueIsNull(ctx, checker)) {
            exception.update(checker.toObject());
        }
        return value;
    }

    public static void checkJSException(JSContextRef ctx, JSValueRef checker, Pointer exception) {
        if (!jsc.JSValueIsNull(ctx, checker)) {
            exception.update(checker.toObject());
        }       
    }

    public static void RaiseNativeToJSException(JSContextRef ctx, Throwable th, Pointer exception) {
        RaiseNativeToJSException(ctx, th, 0, exception);
    }

    public static void RaiseNativeToJSException(JSContextRef ctx, Throwable th, int lineNumber, Pointer exception) {
        StringWriter errors = new StringWriter();
        th.printStackTrace(new PrintWriter(errors));
        JSObjectRef exception_detail = jsc.JSObjectMake(ctx, null);
        JSValueRef javaStackTrace = jsc.JSValueMakeString(ctx, errors.toString());
        JSValueRef javaScriptStackTrace = jsc.JSValueMakeString(ctx, jsc.JSContextCreateBacktrace(ctx, 10));
        JSValueRef jsLineNumber = jsc.JSValueMakeNumber(ctx, lineNumber);
        jsc.JSObjectSetProperty(ctx, exception_detail, "nativeStack", javaStackTrace, JSPropertyAttribute.None, null);
        jsc.JSObjectSetProperty(ctx, exception_detail, "stack", javaScriptStackTrace, JSPropertyAttribute.None, null);
        jsc.JSObjectSetProperty(ctx, exception_detail, "lineNumber", jsLineNumber, JSPropertyAttribute.None, null);
        exception.update(exception_detail);     
    }

    public static JSObjectRef registerJSNamespace(JSContextRef context, JSObjectRef globalObject, String[] namespace) {
        JSObjectRef parentObject = globalObject;
        JSObjectRef namespaceObject = null;
        JSValueRef exception = JSValueRef.Null();
        for (int i = 0; i < namespace.length; i++) {
            JSValueRef value = jsc.JSObjectGetProperty(context, parentObject, namespace[i], exception);
            checkJSException(context, exception);
            if (!value.isObject()) {
                namespaceObject = jsc.JSObjectMake(context, null, exception);
                jsc.JSObjectSetProperty(context, parentObject, namespace[i], namespaceObject, JSPropertyAttribute.DontDelete, exception);
                checkJSException(context, exception);
            } else {
                namespaceObject = value.toObject();
            }
            parentObject = namespaceObject;
        }

        return namespaceObject;
    }

    public static void checkJSException(JSContextRef context, JSValueRef exception) {
        if (!jsc.JSValueIsNull(context, exception)) {
            throw new JavaScriptException(exception.toString());
        }
    }
}