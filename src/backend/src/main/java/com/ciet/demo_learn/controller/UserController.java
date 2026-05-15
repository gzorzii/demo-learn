package com.ciet.demo_learn.controller;

import com.ciet.demo_learn.dto.UserSearchItemDto;
import com.ciet.demo_learn.dto.UserSearchResponse;
import com.ciet.demo_learn.service.UserService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/search")
    public UserSearchResponse search(@RequestParam("q") String q) {
        if (q == null || q.length() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search term must have at least 2 characters");
        }

        List<UserSearchItemDto> users = userService.searchByNameOrEmail(q).stream()
                .map(u -> new UserSearchItemDto(u.getId(), u.getName(), u.getEmail()))
                .toList();

        return new UserSearchResponse(users);
    }
}
