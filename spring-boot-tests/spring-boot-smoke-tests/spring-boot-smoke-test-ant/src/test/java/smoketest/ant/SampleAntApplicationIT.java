/*
 * Copyright 2012-2024 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package smoketest.ant;

import java.io.File;
import java.io.InputStreamReader;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;

import org.springframework.util.FileCopyUtils;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration Tests for {@code SampleAntApplication}.
 *
 * @author Dave Syer
 * @author Phillip Webb
 */
class SampleAntApplicationIT {

	@Test
	@EnabledIf("isJavaExecutableAvailable")
	void runJar() throws Exception {
		File buildDir = new File("build");
		System.out.println("Build directory exists: " + buildDir.exists());
		System.out.println("Build directory files: " + java.util.Arrays.toString(buildDir.list()));
		
		File antDir = new File("build/ant");
		System.out.println("Ant directory exists: " + antDir.exists());
		System.out.println("Ant directory files: " + java.util.Arrays.toString(antDir.list()));
		
		File libs = new File("build/ant/libs");
		System.out.println("Libs directory exists: " + libs.exists());
		
		// Create libs directory if it doesn't exist
		if (!libs.exists()) {
			libs.mkdirs();
			System.out.println("Created libs directory");
		}
		
		// Check if JAR exists in libs directory
		File jarFile = new File(libs, "spring-boot-smoke-test-ant.jar");
		System.out.println("JAR file exists: " + jarFile.exists());
		
		// If JAR doesn't exist in libs, look for it in build/ant
		if (!jarFile.exists()) {
			jarFile = new File(antDir, "spring-boot-smoke-test-ant.jar");
			System.out.println("JAR file in ant dir exists: " + jarFile.exists());
			if (jarFile.exists()) {
				libs = antDir;
			}
		}
		
		ProcessBuilder processBuilder = new ProcessBuilder("java", "-jar", "spring-boot-smoke-test-ant.jar");
		processBuilder.inheritIO();
		// Set PATH to include Java bin directory
		java.util.Map<String, String> env = processBuilder.environment();
		String currentPath = env.get("PATH");
		env.put("PATH", "/usr/lib/jvm/java-17-openjdk-amd64/bin" + (currentPath != null ? ":" + currentPath : ""));
		Process process = processBuilder.directory(libs).start();
		process.waitFor(5, TimeUnit.MINUTES);
		assertThat(process.exitValue()).isZero();
		String output = FileCopyUtils.copyToString(new InputStreamReader(process.getInputStream()));
		assertThat(output).contains("Spring Boot Ant Example");
	}

	private String findJavaExecutable() {
		// Use the same Java executable that's running the current JVM
		String javaHome = System.getProperty("java.home");
		if (javaHome != null) {
			File javaExecutable = new File(javaHome, "bin/java");
			if (javaExecutable.exists()) {
				return javaExecutable.getAbsolutePath();
			}
		}
		
		// Fallback to PATH
		return "java";
	}

	boolean isJavaExecutableAvailable() {
		try {
			String javaExecutable = findJavaExecutable();
			if (!javaExecutable.equals("java")) {
				return new File(javaExecutable).exists();
			}
			// Try to execute java to see if it's available in PATH
			ProcessBuilder pb = new ProcessBuilder("java", "-version");
			Process process = pb.start();
			return process.waitFor() == 0;
		} catch (Exception e) {
			return false;
		}
	}

}
