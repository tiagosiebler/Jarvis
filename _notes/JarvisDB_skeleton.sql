-- Host: localhost
-- Generation Time: Oct 09, 2017 at 04:05 PM
-- Server version: 5.7.17
-- PHP Version: 7.1.7

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `jarvis`
--
CREATE DATABASE IF NOT EXISTS `jarvisdb` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `jarvisdb`;

-- --------------------------------------------------------

--
-- Table structure for table `lu_slack_channels`
--

CREATE TABLE `lu_slack_channels` (
  `slack_channel_id_int` int(11) NOT NULL,
  `slack_channel_id` varchar(255) NOT NULL,
  `slack_channel_name` varchar(255) NOT NULL,
  `slack_channel_visibility` varchar(10) NOT NULL,
  `dt_last_resolved` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `lu_slack_users`
--

CREATE TABLE `lu_slack_users` (
  `slack_user_id_int` int(11) NOT NULL,
  `slack_user_id` varchar(255) NOT NULL,
  `slack_username` varchar(255) NOT NULL,
  `slack_usertitle` varchar(255) NOT NULL,
  `slack_useremail` varchar(255) NOT NULL,
  `slack_team_id` varchar(255) DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `real_name` varchar(255) DEFAULT NULL,
  `dt_last_resolved` datetime NOT NULL,
  `sf_username` varchar(255) DEFAULT NULL,
  `sf_user_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `slack_threads`
--

CREATE TABLE `slack_threads` (
  `thread_id` int(11) NOT NULL,
  `thread_ts` varchar(255) NOT NULL,
  `dt_added` datetime NOT NULL,
  `slack_user_id` varchar(255) NOT NULL,
  `slack_channel_id` varchar(255) NOT NULL,
  `message_text` text NOT NULL,
  `sf_case` int(11) DEFAULT NULL,
  `sf_post_id` varchar(255) DEFAULT NULL,
  `sf_post_created` tinyint(1) NOT NULL,
  `sf_post_url` varchar(255) DEFAULT NULL,
  `sf_should_sync` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `stats_posts`
--

CREATE TABLE `stats_posts` (
  `message_id` int(11) NOT NULL,
  `message_ts` varchar(255) NOT NULL,
  `message_dt` datetime NOT NULL,
  `thread_ts` varchar(255) DEFAULT NULL,
  `post_type` varchar(255) DEFAULT NULL COMMENT 'post in channel or reply to thread',
  `message_text` text,
  `post_url` varchar(255) DEFAULT NULL,
  `slack_user_id` varchar(255) NOT NULL,
  `slack_channel_id` varchar(255) NOT NULL,
  `sf_case` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `lu_slack_channels`
--
ALTER TABLE `lu_slack_channels`
  ADD PRIMARY KEY (`slack_channel_id_int`);

--
-- Indexes for table `lu_slack_users`
--
ALTER TABLE `lu_slack_users`
  ADD PRIMARY KEY (`slack_user_id`),
  ADD UNIQUE KEY `slackUserIntID` (`slack_user_id_int`) USING BTREE;

--
-- Indexes for table `slack_threads`
--
ALTER TABLE `slack_threads`
  ADD PRIMARY KEY (`thread_id`);

--
-- Indexes for table `stats_posts`
--
ALTER TABLE `stats_posts`
  ADD PRIMARY KEY (`message_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `lu_slack_channels`
--
ALTER TABLE `lu_slack_channels`
  MODIFY `slack_channel_id_int` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `lu_slack_users`
--
ALTER TABLE `lu_slack_users`
  MODIFY `slack_user_id_int` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `slack_threads`
--
ALTER TABLE `slack_threads`
  MODIFY `thread_id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `stats_posts`
--
ALTER TABLE `stats_posts`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
