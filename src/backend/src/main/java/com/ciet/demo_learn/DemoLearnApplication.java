package com.ciet.demo_learn;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class DemoLearnApplication {

	public static void main(String[] args) {
		SpringApplication.run(DemoLearnApplication.class, args);
	}

}
