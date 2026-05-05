package com.ciet.demo_learn.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ciet.demo_learn.service.GoogleTokenVerificationService;
import com.ciet.demo_learn.service.JwtIssuerService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/auth")
class AuthController {

    private final GoogleTokenVerificationService googleVerifier;
    private final JwtIssuerService jwtIssuer;

    AuthController(GoogleTokenVerificationService googleVerifier, JwtIssuerService jwtIssuer) {
        this.googleVerifier = googleVerifier;
        this.jwtIssuer = jwtIssuer;
    }

    @PostMapping("/google")
    ResponseEntity<AuthResponse> googleAuth(@Valid @RequestBody GoogleAuthRequest request) {
        var googleJwt = googleVerifier.verify(request.idToken());
        var token = jwtIssuer.issue(
                googleJwt.getSubject(),
                googleJwt.getClaimAsString("email"),
                List.of("USER")
        );
        return ResponseEntity.ok(new AuthResponse(token));
    }

    record GoogleAuthRequest(@NotBlank String idToken) {}

    record AuthResponse(String accessToken) {}
}