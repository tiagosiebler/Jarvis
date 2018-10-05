/*
 Navicat Premium Data Transfer

 Source Server         : JarvisDB-tsiebler
 Source Server Type    : MariaDB
 Source Server Version : 50556
 Source Host           : slackbot:3306
 Source Schema         : jarvisdb

 Target Server Type    : MariaDB
 Target Server Version : 50556
 File Encoding         : 65001

 Date: 05/10/2018 12:33:04
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for lu_slack_channels
-- ----------------------------
DROP TABLE IF EXISTS `lu_slack_channels`;
CREATE TABLE `lu_slack_channels` (
  `slack_channel_id_int` int(11) NOT NULL AUTO_INCREMENT,
  `slack_channel_id` varchar(255) NOT NULL,
  `slack_channel_name` varchar(255) NOT NULL,
  `slack_channel_visibility` varchar(10) NOT NULL,
  `dt_last_resolved` datetime NOT NULL,
  PRIMARY KEY (`slack_channel_id_int`)
) ENGINE=InnoDB AUTO_INCREMENT=96 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for lu_slack_users
-- ----------------------------
DROP TABLE IF EXISTS `lu_slack_users`;
CREATE TABLE `lu_slack_users` (
  `slack_user_id_int` int(11) NOT NULL AUTO_INCREMENT,
  `slack_user_id` varchar(255) NOT NULL,
  `slack_username` varchar(255) NOT NULL,
  `slack_usertitle` varchar(255) DEFAULT NULL,
  `slack_useremail` varchar(255) NOT NULL,
  `slack_team_id` varchar(255) DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `real_name` varchar(255) DEFAULT NULL,
  `dt_last_resolved` datetime NOT NULL,
  `sf_username` varchar(255) DEFAULT NULL,
  `sf_user_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`slack_user_id`),
  UNIQUE KEY `slackUserIntID` (`slack_user_id_int`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=546 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for sf_auth
-- ----------------------------
DROP TABLE IF EXISTS `sf_auth`;
CREATE TABLE `sf_auth` (
  `sf_auth_id` int(11) NOT NULL AUTO_INCREMENT,
  `sf_user_id` varchar(255) NOT NULL,
  `dt_authed` datetime NOT NULL,
  `sf_token` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`sf_auth_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for slack_threads
-- ----------------------------
DROP TABLE IF EXISTS `slack_threads`;
CREATE TABLE `slack_threads` (
  `thread_id` int(11) NOT NULL AUTO_INCREMENT,
  `thread_ts` varchar(255) NOT NULL,
  `dt_added` datetime NOT NULL,
  `slack_user_id` varchar(255) NOT NULL,
  `slack_channel_id` varchar(255) NOT NULL,
  `message_text` text NOT NULL,
  `sf_case` int(11) DEFAULT NULL,
  `sf_post_id` varchar(255) DEFAULT NULL,
  `sf_post_created` tinyint(1) NOT NULL,
  `sf_post_url` varchar(255) DEFAULT NULL,
  `sf_should_sync` tinyint(1) NOT NULL,
  PRIMARY KEY (`thread_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3011 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for stats_posts
-- ----------------------------
DROP TABLE IF EXISTS `stats_posts`;
CREATE TABLE `stats_posts` (
  `message_id` int(11) NOT NULL AUTO_INCREMENT,
  `message_ts` varchar(255) NOT NULL,
  `message_dt` datetime NOT NULL,
  `thread_ts` varchar(255) DEFAULT NULL,
  `post_type` varchar(255) DEFAULT NULL COMMENT 'post in channel or reply to thread',
  `message_text` text,
  `post_url` varchar(255) DEFAULT NULL,
  `slack_user_id` varchar(255) NOT NULL,
  `slack_channel_id` varchar(255) NOT NULL,
  `sf_case` int(11) DEFAULT NULL,
  PRIMARY KEY (`message_id`)
) ENGINE=InnoDB AUTO_INCREMENT=79490 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for test1
-- ----------------------------
DROP TABLE IF EXISTS `test1`;
CREATE TABLE `test1` (
  `t1` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- View structure for rob
-- ----------------------------
DROP VIEW IF EXISTS `rob`;
CREATE ALGORITHM=UNDEFINED DEFINER=`analytics`@`%` SQL SECURITY DEFINER VIEW `rob` AS select `stats_posts`.`message_id` AS `message_id`,`stats_posts`.`message_ts` AS `message_ts`,`stats_posts`.`message_dt` AS `message_dt`,`stats_posts`.`thread_ts` AS `thread_ts`,`stats_posts`.`post_type` AS `post_type`,`stats_posts`.`message_text` AS `message_text`,`stats_posts`.`post_url` AS `post_url`,`stats_posts`.`slack_user_id` AS `slack_user_id`,`stats_posts`.`slack_channel_id` AS `slack_channel_id`,`stats_posts`.`sf_case` AS `sf_case` from `stats_posts` limit 10;

-- ----------------------------
-- View structure for slack_missing_answer
-- ----------------------------
DROP VIEW IF EXISTS `slack_missing_answer`;
CREATE ALGORITHM=UNDEFINED DEFINER=`analytics`@`%` SQL SECURITY DEFINER VIEW `slack_missing_answer` AS select `slack_post_q`.`message_id` AS `message_id`,`slack_post_q`.`message_ts` AS `message_ts`,`slack_post_q`.`message_dt` AS `message_dt`,`slack_post_q`.`thread_ts` AS `thread_ts`,`slack_post_q`.`post_type` AS `post_type`,`slack_post_q`.`message_text` AS `message_text`,`slack_post_q`.`post_url` AS `post_url`,`slack_post_q`.`slack_user_id` AS `slack_user_id`,`slack_post_q`.`slack_channel_id` AS `slack_channel_id`,`slack_post_q`.`sf_case` AS `sf_case` from `slack_post_q` where (not(`slack_post_q`.`message_ts` in (select `slack_post_a`.`thread_ts` from `slack_post_a`)));

-- ----------------------------
-- View structure for slack_post_a
-- ----------------------------
DROP VIEW IF EXISTS `slack_post_a`;
CREATE ALGORITHM=UNDEFINED DEFINER=`analytics`@`%` SQL SECURITY DEFINER VIEW `slack_post_a` AS select `stats_posts`.`message_id` AS `message_id`,`stats_posts`.`message_ts` AS `message_ts`,`stats_posts`.`message_dt` AS `message_dt`,`stats_posts`.`thread_ts` AS `thread_ts`,`stats_posts`.`post_type` AS `post_type`,`stats_posts`.`message_text` AS `message_text`,`stats_posts`.`post_url` AS `post_url`,`stats_posts`.`slack_user_id` AS `slack_user_id`,`stats_posts`.`slack_channel_id` AS `slack_channel_id`,`stats_posts`.`sf_case` AS `sf_case` from `stats_posts` where (`stats_posts`.`post_type` = 'reply');

-- ----------------------------
-- View structure for slack_post_q
-- ----------------------------
DROP VIEW IF EXISTS `slack_post_q`;
CREATE ALGORITHM=UNDEFINED DEFINER=`analytics`@`%` SQL SECURITY DEFINER VIEW `slack_post_q` AS select `stats_posts`.`message_id` AS `message_id`,`stats_posts`.`message_ts` AS `message_ts`,`stats_posts`.`message_dt` AS `message_dt`,`stats_posts`.`thread_ts` AS `thread_ts`,`stats_posts`.`post_type` AS `post_type`,`stats_posts`.`message_text` AS `message_text`,`stats_posts`.`post_url` AS `post_url`,`stats_posts`.`slack_user_id` AS `slack_user_id`,`stats_posts`.`slack_channel_id` AS `slack_channel_id`,`stats_posts`.`sf_case` AS `sf_case` from `stats_posts` where (`stats_posts`.`post_type` = 'post');

SET FOREIGN_KEY_CHECKS = 1;
