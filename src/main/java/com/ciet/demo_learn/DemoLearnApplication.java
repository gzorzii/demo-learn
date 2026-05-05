package com.ciet.demo_learn;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import com.ciet.demo_learn.config.AppProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class DemoLearnApplication {

	public static void main(String[] args) {
		SpringApplication.run(DemoLearnApplication.class, args);
	}

}
