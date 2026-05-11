package com.ciet.demo_learn.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Component
public class AuthContext {

    public Jwt getJwt() {
        var auth = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
        return auth.getToken();
    }

    public UUID getUserId() {
        return UUID.fromString(getJwt().getSubject());
    }

    public UUID getBranchId() {
        return resolveBranchId(null);
    }

    public UUID resolveBranchId(UUID override) {
        Jwt jwt = getJwt();
        List<String> roles = jwt.getClaimAsStringList("roles");
        if (override != null && roles != null && roles.contains("Administrador")) {
            return override;
        }
        String branchIdStr = jwt.getClaimAsString("branchId");
        if (branchIdStr == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usuário sem filial associada.");
        }
        return UUID.fromString(branchIdStr);
    }
}
