package com.ciet.demo_learn.service;

import java.util.List;
import java.util.Set;

import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

import com.ciet.demo_learn.config.AppProperties;

@Service
public class GoogleTokenVerificationService {

    private static final String GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> VALID_ISSUERS = Set.of(
            "accounts.google.com",
            "https://accounts.google.com"
    );

    private final JwtDecoder googleDecoder;

    GoogleTokenVerificationService(AppProperties props) {
        OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<Object>(
                JwtClaimNames.AUD,
                aud -> switch (aud) {
                    case List<?> list -> list.contains(props.google().clientId());
                    case String s -> s.equals(props.google().clientId());
                    case null -> false;
                    default -> false;
                }
        );

        OAuth2TokenValidator<Jwt> issuerValidator = new JwtClaimValidator<>(
                JwtClaimNames.ISS,
                iss -> VALID_ISSUERS.contains(iss)
        );

        var validator = new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                audienceValidator,
                issuerValidator
        );

        var decoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWKS_URI).build();
        decoder.setJwtValidator(validator);
        this.googleDecoder = decoder;
    }

    public Jwt verify(String idToken) {
        return googleDecoder.decode(idToken);
    }
}