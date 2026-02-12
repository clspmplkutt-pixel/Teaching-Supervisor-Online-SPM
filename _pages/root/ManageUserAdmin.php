<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "จัดการผู้ใช้งานระดับผู้ดูแลระบบ";
$tbl = "tbl_user";
$row_user = $database->select(
    $tbl,
    "*",
    [
        "level_id" => "admin",
        "ORDER" => [
            "id" => "ASC"
        ]
    ]
);

?>

<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page; ?></h3>
            </div>
            <div class="card-body">
                <a href="?module=UserAdmin_Add" class="btn btn-outline-primary btn-block"><i class="fa-solid fa-user-shield"></i> เพิ่มผู้ดูแลระบบ</a>
                <div class="table-responsive">
                    <table class="table table-bordered table-striped table-hover">
                        <thead>
                            <tr>
                                <th>ชื่อ - นามสกุล</th>
                                <th>ชื่อผู้ใช้งาน</th>
                                <th>Last Login</th>
                                <th>Operation</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            if (count($row_user) != 0) {
                                foreach ($row_user as $data_user) {
                                    echo "<tr>";
                                    echo "<td>"  . $data_user['name'] .  "</td>";
                                    echo "<td>"  . $data_user['user'] .  "</td>";
                                    echo "<td>" . $data_user['lastlog'] . "</td>";
                            ?>
                                    <td>
                                        <div class="btn-group">
                                            <a href="?module=UserAdmin_Edit&user=<?php echo $data_user["user"]; ?>" class="btn btn-sm btn-warning"><i class="fa-regular fa-pen-to-square"></i>
                                                แก้ไข</a>
                                            <a href="#" onclick="return Remove_User('<?php echo $data_user["user"]; ?>');" class="btn btn-sm btn-danger"><i class="fa-regular fa-trash-can"></i> ลบ</a>
                                            <a href="?module=UserAdmin_Chgpwd&user=<?php echo $data_user["user"]; ?>" class="btn btn-sm btn-info"><i class="fa-solid fa-key"></i> รหัสผ่าน</a>
                                        </div>
                                    </td>
                            <?php

                                    echo "</tr>";
                                }
                            } else {
                                echo "<tr><td colspan=\"3\" class=\"text-center\"><h2 class=\"text-danger\">ยังไม่มีข้อมูล</h2></td></tr>";
                            }
                            ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
