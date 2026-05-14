package com.ciet.demo_learn.service;

import com.ciet.demo_learn.auth.JwtTokenProvider;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ciet.demo_learn.repository.UserRepository;

import java.util.Collections;
import java.util.List;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final String googleClientId;

    public AuthService(UserRepository userRepository, JwtTokenProvider jwtTokenProvider,
                       @Value("${app.google.client-id}") String googleClientId) {
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.googleClientId = googleClientId;
    }

    @Transactional(readOnly = true)
    public String login(String email) {
        var user = userRepository.findByEmailWithPermissions(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        List<String> permissions = user.getUserPermissions().stream()
                .map(up -> up.getPermission().name())
                .toList();
        if (permissions.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return jwtTokenProvider.generate(user, permissions, null);
    }

    @Transactional(readOnly = true)
    public String googleLogin(String idToken) {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        GoogleIdToken googleToken;
        try {
            googleToken = verifier.verify(idToken);
        } catch (Exception _) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        if (googleToken == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        GoogleIdToken.Payload payload = googleToken.getPayload();
        String email = payload.getEmail();
        String picture = (String) payload.get("picture");

        var user = userRepository.findByEmailWithPermissions(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        List<String> permissions = user.getUserPermissions().stream()
                .map(up -> up.getPermission().name())
                .toList();
        if (permissions.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        return jwtTokenProvider.generate(user, permissions, picture);
    }
}
