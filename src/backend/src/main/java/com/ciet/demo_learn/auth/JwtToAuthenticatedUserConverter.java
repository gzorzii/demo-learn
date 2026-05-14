package com.ciet.demo_learn.auth;

import com.ciet.demo_learn.dto.AuthenticatedUser;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class JwtToAuthenticatedUserConverter implements Converter<Jwt, UsernamePasswordAuthenticationToken> {

    @Override
    public UsernamePasswordAuthenticationToken convert(Jwt jwt) {
        List<String> roles = jwt.getClaimAsStringList("roles");
        if (roles == null) {
            roles = List.of();
        }
        var authorities = roles.stream().map(SimpleGrantedAuthority::new).toList();
        AuthenticatedUser user = new AuthenticatedUser(
                UUID.fromString(jwt.getSubject()),
                jwt.getClaimAsString("name"),
                jwt.getClaimAsString("email"),
                roles,
                jwt.getClaimAsString("picture")
        );
        return new UsernamePasswordAuthenticationToken(user, null, authorities);
    }
}