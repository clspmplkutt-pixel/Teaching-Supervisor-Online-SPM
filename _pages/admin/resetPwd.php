<?php
$data = $database->get("tbl_Users", "*", ["id" => $id]);
$birthday_array = explode("-", $data['birthday']);
$birthday = $birthday_array[0] . $birthday_array[1] . $birthday_array[2];
$passwd = encrypt_decrypt("encrypt", $birthday);
$database->update("tbl_Users", ["passwd" => $passwd], ["id" => $id]);
location_to("?module=" . $from_module, "3");
?>
<span class="text-success">Reset รหัสผ่านเรียบร้อยกำลังกลับไปหน้าเดิม</span>
