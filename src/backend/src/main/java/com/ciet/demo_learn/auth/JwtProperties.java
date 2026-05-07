package com.ciet.demo_learn.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record JwtProperties(Jwt jwt, Cookie cookie) {

    public record Jwt(String secret, long expirationSeconds) {}
    public record Cookie(boolean secure) {}
}
