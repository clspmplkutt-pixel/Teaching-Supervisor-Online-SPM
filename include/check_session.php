<?php
if ($_SESSION[$check_session_name] != $check_session_value) {
    Header("Location: login.php");
    die();
}
