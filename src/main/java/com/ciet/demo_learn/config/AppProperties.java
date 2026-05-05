package com.ciet.demo_learn.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
    JwtProperties jwt,
    GoogleProperties google,
    CorsProperties cors
) {
    public record JwtProperties(String secret, long expirationMs) {}
    public record GoogleProperties(String clientId) {}
    public record CorsProperties(List<String> allowedOrigins) {}
}