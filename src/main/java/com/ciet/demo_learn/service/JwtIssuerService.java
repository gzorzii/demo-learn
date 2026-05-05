package com.ciet.demo_learn.service;

import java.time.Instant;
import java.util.List;

import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import com.ciet.demo_learn.config.AppProperties;

@Service
public class JwtIssuerService {

    private final JwtEncoder encoder;
    private final long expirationMs;

    JwtIssuerService(JwtEncoder encoder, AppProperties props) {
        this.encoder = encoder;
        this.expirationMs = props.jwt().expirationMs();
    }

    public String issue(String subject, String email, List<String> roles) {
        var now = Instant.now();
        var claims = JwtClaimsSet.builder()
                .subject(subject)
                .issuedAt(now)
                .expiresAt(now.plusMillis(expirationMs))
                .claim("email", email)
                .claim("roles", roles)
                .build();
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
}