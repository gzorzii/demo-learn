package com.ciet.demo_learn.catalog;

import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface StorageService {
    String store(MultipartFile file, UUID bookId);
    void delete(String url);
}
