# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **51Talk "小学英语学霸笔记" (Primary School English Top Student Notes) promotional landing page** that allows users to claim free educational materials. The project appears to be in the planning/documentation phase with only requirement specifications currently available.

## Project Structure

Currently, this project contains:
- `51Talk"小学英语学霸笔记"领取活动页需求文档.md` - Complete product requirements document (PRD) in Chinese
- `51Talk.png` - Project image asset
- `.claude/` - Claude Code configuration directory

## Key Requirements Summary

**Core Functionality:**
- Single-page landing page for educational material distribution
- Device-based limiting using localStorage (30-day restriction)
- IP-based limiting via Supabase Edge Functions and PostgreSQL
- No user authentication required
- Responsive design (mobile-first)

**Technical Stack (as specified in requirements):**
- Frontend: HTML/CSS/JavaScript with localStorage
- Backend: Supabase Edge Functions
- Database: Supabase PostgreSQL with `anonymous_claims` table
- File distribution: Baidu Netdisk links

**Data Model:**
- Table: `anonymous_claims`
- Fields: `ip_address` (unique), `last_claimed_at` (timestamp), `claimed_version` (text)

## Development Notes

This project is currently in the **planning phase** - only documentation exists. When implementing:

1. Follow the Chinese PRD specifications exactly
2. Implement device restrictions using localStorage with 30-day expiration
3. Create Supabase Edge Function for IP-based validation
4. Use the exact Baidu Netdisk links provided in the requirements
5. Implement responsive design following 51Talk brand guidelines
6. The page should be in Chinese as specified in the requirements

## Content Reference

All page copy, version mappings, and technical specifications are detailed in the requirements document. Refer to `51Talk"小学英语学霸笔记"领取活动页需求文档.md` for complete implementation details.