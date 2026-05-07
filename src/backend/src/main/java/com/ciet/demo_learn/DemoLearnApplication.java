package com.ciet.demo_learn;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class DemoLearnApplication {

	public static void main(String[] args) {
		SpringApplication.run(DemoLearnApplication.class, args);
	}

}
