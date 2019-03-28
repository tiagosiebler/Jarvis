# Installation & Configuration Guidelines for Jarvis

## Prerequisites

### NodeJS
The core of Jarvis runs in a NodeJS process, using a number of modules to make things easier. Installation is relatively simple once NodeJS is has been installed.

#### Installation of NodeJS
Download and install NodeJS 8.x or newer from the [NodeJS website](https://nodejs.org/en/).

#### Installation of NodeJS dependencies for Jarvis
These are the steps to get started with the Jarvis repository

```
$ git clone https://github.com/tiagosiebler/Jarvis.git
$ cd Jarvis
$ npm install
```

This will:
1. Clone the repository
2. Navigate into the folder containing Jarvis
3. Install the NodeJS dependencies used by Jarvis

### MariaDB
#### Installation of MariaDB
Follow the online documentation from the [MariaDB website](https://mariadb.org/) on installing and launching this server on your machine.

#### Restoring the JarvisDB skeleton
Jarvis expects certain tables with specific columns in the database. A mismatch might lead to an exception, which will crash the NodeJS process if not handled correctly.

For convenience, the current database structure can be found in the [JarvisDB_Skeleton.sql](../_notes/sql/JarvisDB_skeleton.sql) file in the `_notes/sql` folder of this repository.

The official MariaDB documentation explains how to restore a SQL file into a database:
[https://mariadb.com/kb/en/library/restoring-data-from-dump-files/](https://mariadb.com/kb/en/library/restoring-data-from-dump-files/)

For convenience, I've documented a rough process for creating a DB and restoring the needed schema:
 [Restoring the JarvisDB Schema](../_notes/restoreDBSkeleton.md)

### API Credentials

Jarvis connects to a number of 3rd party APIs. These connections are enabled through API credentials, usually with:
- API Key (sometimes called Client ID).
- API Secret

Some APIs require more information when making a request. Detailed creation for each API key combination can be seen in [API Setup](../_notes/APISetup.md) (not yet written : TODO).

## Configuration

All configurable variables are defined in a `.env` file. This does not exist by default, but can be created from a template:
- Make a copy of `.env-template` and rename the copy to `.env`.

This `.env` file contains the API credentails and any configuration for the bot and the systems the bot will connect to.

Edit this file in any plaintext editor.

- Under #slack, make sure the PORT = 3000, or whichever port you are running ngrok on. 
- Under #mysql details, check that these are matching your MariaDB database credentials

## Launching Jarvis

Refer to [launching.md](../_notes/launching.md) (not yet written : TODO).
