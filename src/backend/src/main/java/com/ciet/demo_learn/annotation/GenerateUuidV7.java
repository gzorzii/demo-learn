package com.ciet.demo_learn.annotation;

import org.hibernate.annotations.IdGeneratorType;

import com.ciet.demo_learn.model.generate.UuidV7Generator;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@IdGeneratorType(UuidV7Generator.class)
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD, ElementType.METHOD})
public @interface GenerateUuidV7 {}
