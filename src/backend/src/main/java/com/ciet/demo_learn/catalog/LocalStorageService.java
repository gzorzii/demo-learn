package com.ciet.demo_learn.catalog;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Service
public class LocalStorageService implements StorageService {

    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    @Value("${app.storage.upload-dir:uploads}")
    private String uploadDir;

    @Override
    public String store(MultipartFile file, UUID bookId) {
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato de imagem inválido. Aceito: JPEG, PNG, WebP.");
        }

        String extension = switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png"  -> ".png";
            case "image/webp" -> ".webp";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        };

        String filename = UUID.randomUUID() + extension;
        Path dir = Paths.get(uploadDir, "books", bookId.toString());

        try {
            Files.createDirectories(dir);
            Files.copy(file.getInputStream(), dir.resolve(filename));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao salvar imagem.");
        }

        return "/uploads/books/" + bookId + "/" + filename;
    }

    @Override
    public void delete(String url) {
        if (url == null || !url.startsWith("/uploads/")) return;
        Path file = Paths.get(uploadDir, url.substring("/uploads/".length()));
        try {
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
        }
    }
}
