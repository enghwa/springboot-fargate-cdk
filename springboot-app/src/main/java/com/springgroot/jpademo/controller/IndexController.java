package com.springgroot.jpademo.controller;


import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/")
public class IndexController {

    @GetMapping
    public String sayHello() {
        return "OK! You can create a new note by making a POST request to /api/notes endpoint.";
        // return "OK! You can create a new Note by making a POST request with param {title, content} to /api/notes endpoint.";
    }
}