<?php
$data = $database->select("tbl_Users", "*");
foreach ($data as $row) {
    $birthday_array = explode("-", $row['birthday']);
    $birthday = $birthday_array[0] . $birthday_array[1] . $birthday_array[2];
    $passwd = encrypt_decrypt("encrypt", $birthday);
    $database->update("tbl_Users", ["passwd" => $passwd], ["id" => $row['id']]);
}
