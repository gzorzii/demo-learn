package com.ciet.demo_learn.controller;

import com.ciet.demo_learn.dto.AuthenticatedUser;
import com.ciet.demo_learn.dto.TeamMembersResponse;
import com.ciet.demo_learn.service.MyTeamService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/my-team")
public class MyTeamController {

    private final MyTeamService myTeamService;

    public MyTeamController(MyTeamService myTeamService) {
        this.myTeamService = myTeamService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('PDM', 'ADMIN')")
    public TeamMembersResponse getTeam(@AuthenticationPrincipal AuthenticatedUser user) {
        return myTeamService.getTeamMembers(user.id());
    }

    @PostMapping("/{subjectUserId}/cycles/cf")
    @PreAuthorize("hasAnyAuthority('PDM', 'ADMIN')")
    public ResponseEntity<Void> startCf(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable UUID subjectUserId) {
        myTeamService.startCf(user.id(), subjectUserId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
