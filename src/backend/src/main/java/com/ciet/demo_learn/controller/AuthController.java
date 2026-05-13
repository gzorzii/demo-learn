package com.ciet.demo_learn.controller;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ciet.demo_learn.dto.GoogleLoginRequest;
import com.ciet.demo_learn.dto.JwtProperties;
import com.ciet.demo_learn.dto.LoginRequest;
import com.ciet.demo_learn.service.AuthService;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtProperties jwtProperties;

    public AuthController(AuthService authService, JwtProperties jwtProperties) {
        this.authService = authService;
        this.jwtProperties = jwtProperties;
    }

    @PostMapping("/login")
    public ResponseEntity<Void> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        String token = authService.login(request.email());
        int maxAge = (int) jwtProperties.jwt().expirationSeconds();
        boolean secure = jwtProperties.cookie().secure();

        addCookie(response, "auth_token", token, maxAge, true, secure);
        addCookie(response, "auth_info", token.split("\\.")[1], maxAge, false, secure);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/google")
    public ResponseEntity<Void> googleLogin(@Valid @RequestBody GoogleLoginRequest request, HttpServletResponse response) {
        String token = authService.googleLogin(request.idToken());
        int maxAge = (int) jwtProperties.jwt().expirationSeconds();
        boolean secure = jwtProperties.cookie().secure();
        addCookie(response, "auth_token", token, maxAge, true, secure);
        addCookie(response, "auth_info", token.split("\\.")[1], maxAge, false, secure);
        return ResponseEntity.ok().build();
    }

    private void addCookie(HttpServletResponse response, String name, String value,
                           int maxAge, boolean httpOnly, boolean secure) {
        StringBuilder sb = new StringBuilder();
        sb.append(name).append("=").append(value);
        sb.append("; Path=/");
        sb.append("; Max-Age=").append(maxAge);
        sb.append("; SameSite=Strict");
        if (secure) sb.append("; Secure");
        if (httpOnly) sb.append("; HttpOnly");
        response.addHeader("Set-Cookie", sb.toString());
    }
}
