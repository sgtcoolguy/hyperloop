/**
 * Java Metabase Generator
 */
import java.io.File;
import java.io.PrintWriter;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.Set;
import java.util.jar.JarFile;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import org.apache.bcel.classfile.AccessFlags;
import org.apache.bcel.classfile.ExceptionTable;
import org.apache.bcel.classfile.Field;
import org.apache.bcel.classfile.JavaClass;
import org.apache.bcel.classfile.Method;
import org.apache.bcel.generic.Type;
import org.apache.bcel.util.ClassPath;
import org.apache.bcel.util.SyntheticRepository;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONWriter;

/**
 * Class that will generate a metadatabase from the Java classpath
 */
public class JavaMetabaseGenerator
{
	private static final SyntheticRepository repo = SyntheticRepository.getInstance();
	private static final Pattern isClass = Pattern.compile("\\.class$");

	/**
	 * this is a regular expression of packages that we want to blacklist and not include in the output
	 */
	private static final Pattern blacklist = Pattern
			.compile("^(javax\\/|com\\/sun|com\\/oracle|jdk\\/internal|org\\/apache\\/bcel|org\\/jcp|org\\/json|org\\/ietf|sun\\/|com\\/apple|quicktime\\/|apple\\/|com\\/oracle\\/jrockit|oracle\\/jrockit|sunw\\/|org\\/omg|java\\/awt|java\\/applet|junit\\/|edu\\/umd\\/cs\\/findbugs)");

	/**
	 * enumerate over a zip/jar and load up it's classes
	 */
	private static void enumerate(Enumeration<? extends ZipEntry> e, JSONWriter writer, Set<String> uniques)
			throws Exception
	{

		while (e.hasMoreElements())
		{
			String entry = e.nextElement().toString();
			if (!blacklist.matcher(entry).find() && isClass.matcher(entry).find())
			{
				String classname = entry.replaceAll("/", ".").replace(".class", "");
				if (uniques.contains(classname))
				{
					continue;
				}

				JavaClass cls = repo.loadClass(classname);
				writer.key(classname);
				writer.object();
				asJSON(cls, writer);
				writer.endObject();

				uniques.add(classname);
			}
		}
	}

	/**
	 * add access modifiers for a field or method
	 */
	private static JSONArray addAttributes(AccessFlags obj)
	{
		JSONArray json = new JSONArray();

		if (obj.isFinal())
		{
			json.put("final");
		}
		if (obj.isAbstract())
		{
			json.put("abstract");
		}
		if (obj.isPrivate())
		{
			json.put("private");
		}
		if (obj.isProtected())
		{
			json.put("protected");
		}
		if (obj.isPublic())
		{
			json.put("public");
		}
		if (obj.isStatic())
		{
			json.put("static");
		}
		if (obj.isNative())
		{
			json.put("native");
		}
		return json;
	}

	/**
	 * this class takes no arguments and returns JSON as System.out
	 */
	public static void main(String[] args) throws Exception
	{
		ClassPath cp = new ClassPath();
		String classpath = cp.getClassPath();
		String tokens[] = classpath.split(File.pathSeparator);

		PrintWriter pw = new PrintWriter(System.out, true);
		JSONWriter writer = new JSONWriter(pw);
		writer.object();
		writer.key("classes");
		writer.object();
		Set<String> uniques = new HashSet<String>();
		for (String token : tokens)
		{
			if (token.endsWith(".jar"))
			{
				JarFile jarFile = new JarFile(token);
				enumerate(jarFile.entries(), writer, uniques);
			}
			else if (token.endsWith(".zip"))
			{
				ZipFile zipFile = new ZipFile(token);
				enumerate(zipFile.entries(), writer, uniques);
			}
		}
		writer.endObject();
		writer.endObject();
		pw.flush();
	}

	private static void asJSON(JavaClass javaClass, JSONWriter writer)
	{
		// package
		writer.key("package");
		writer.value(javaClass.getPackageName());

		// interfaces
		writer.key("interfaces");
		writer.array();
		for (String intfn : javaClass.getInterfaceNames())
		{
			writer.value(intfn);
		}
		writer.endArray();

		// superclass
		writer.key("superClass");
		writer.value(javaClass.getSuperclassName());

		// attributes
		writer.key("attributes");
		writer.value(addAttributes(javaClass));

		// metatype
		writer.key("metatype");
		writer.value(javaClass.isInterface() ? "interface" : "class");

		// methods
		writer.key("methods");
		JSONObject methodsJSON = new JSONObject();
		Method methods[] = javaClass.getMethods();
		for (Method method : methods)
		{
			JSONObject methodJSON = new JSONObject();
			methodJSON.put("attributes", addAttributes(method));
			JSONArray overloads;
			if (methodsJSON.has(method.getName()))
			{
				overloads = methodsJSON.getJSONArray(method.getName());
			}
			else
			{
				overloads = new JSONArray();
			}
			overloads.put(methodJSON);
			methodsJSON.put(method.getName(), overloads);
			JSONArray argumentJSON = new JSONArray();
			for (Type type : method.getArgumentTypes())
			{
				JSONObject obj = new JSONObject();
				obj.put("type", type);
				argumentJSON.put(obj);
			}
			methodJSON.put("args", argumentJSON);
			methodJSON.put("returnType", method.getReturnType());
			JSONArray exceptionsJSON = new JSONArray();
			ExceptionTable exceptions = method.getExceptionTable();
			if (exceptions != null)
			{
				for (String exname : exceptions.getExceptionNames())
				{
					exceptionsJSON.put(exname);
				}
			}
			methodJSON.put("exceptions", exceptionsJSON);
		}
		writer.value(methodsJSON);

		// properties
		writer.key("properties");
		JSONObject propertiesJSON = new JSONObject();
		Field fields[] = javaClass.getFields();
		for (Field field : fields)
		{
			JSONObject fieldJSON = new JSONObject();
			fieldJSON.put("attributes", addAttributes(field));
			fieldJSON.put("type", field.getType());
			fieldJSON.put("value", field.getConstantValue());
			fieldJSON.put("metatype", field.getConstantValue() != null ? "constant" : "field");
			fieldJSON.put("attributes", addAttributes(field));
			propertiesJSON.put(field.getName(), fieldJSON);
		}
		writer.value(propertiesJSON);
	}
}
