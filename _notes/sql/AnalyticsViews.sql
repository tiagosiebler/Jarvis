/*
 These are optional views primarily used for reporting purposes in Aquaduct
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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
