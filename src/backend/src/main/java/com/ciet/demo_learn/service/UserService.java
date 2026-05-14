package com.ciet.demo_learn.service;

import com.ciet.demo_learn.model.User;
import com.ciet.demo_learn.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> findActiveByPdmId(UUID pdmId) {
        return userRepository.findByPdmIdAndActiveTrueAndDeletedAtIsNull(pdmId);
    }

    public boolean existsByIdAndPdmId(UUID userId, UUID pdmId) {
        return userRepository.existsByIdAndPdmIdAndActiveTrueAndDeletedAtIsNull(userId, pdmId);
    }

    public Optional<User> findById(UUID userId) {
        return userRepository.findById(userId);
    }
}
