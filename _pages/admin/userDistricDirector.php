<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ผู้เข้าใช้งานระบบ ผู้อำนวยการเขตพื้นที่การศึกษา/รองผู้อำนวยการเขตพื้นที่การศึกษา	";
$tbl = "tbl_Users";
$row_user = $database->select(
    $tbl,
    "*",
    [
        "level" => "districdirector",
        "register_isConfirm" => "1",
        "status"=> "1",
        "ORDER" => [
            "position_id" => "DESC"
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
                <div class="col-sm-12">
                    <span class="float-sm-right">
                        <a class="btn btn-outline-info" href="?module=userDD_add"><i class="fa-solid fa-plus"></i> เพิ่มผู้ใช้งาน</a>
                    </span>
                </div>
                <div class="table-responsive">
                    <table class="table table-bordered table-striped table-hover" id="data">
                        <thead>
                            <tr>
                                <th>ที่</th>
                                <th>เลขประจำตัวประชาชน</th>
                                <th>ชื่อ - นามสกุล</th>
                                <th>ตำแหน่ง</th>
                                <th>วิทยฐานะ</th>
                                <th>Operation</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $i = 1;
                            if (count($row_user) != 0) {
                                foreach ($row_user as $data_user) {
                                    $prefix = $database->get("tbl_system_prefix", "*", ["prefix_id" => $data_user['prefix']]);
                                    $position = $database->get("tbl_system_PersonPositionType", "*", ["position_id" => $data_user['position_id']]);
                                    $academic = $database->get("tbl_system_Academic_Standing", "*", ["academic_id" => $data_user['academic_id']]);
                            ?>
                                    <tr>

                                        <td class="text-center"><?php echo $i; ?></td>
                                        <td><?php echo $data_user['people_id']; ?></td>
                                        <td><?php echo $prefix['prefix'] . $data_user['name'] . " " . $data_user['lastname']; ?></td>
                                        <td><?php echo $position['position_name']; ?></td>
                                        <td><?php echo $academic['academic_standing']; ?></td>
                                        <td>
                                            <div class="btn-group">
                                                <?php if ($data_user['people_id'] != "") { ?>
                                                    <a href="?module=dd_edit&people_id=<?php echo $data_user['people_id']; ?>" class="btn btn-warning btn-sm"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</a>
                                                <?php } else { ?>
                                                    <a href="?module=dd_edit&id=<?php echo $data_user['id']; ?>" class="btn btn-warning btn-sm"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</a>
                                                <?php } ?>
                                                <a href="#" class="btn btn-danger btn-sm" onclick="Remove_User('<?php echo $data_user['people_id']; ?>','<?php echo $module;?>')"><i class="fa-solid fa-trash"></i> ลบ</a>
                                                <a href="?module=resetPwd&id=<?php echo $data_user['id']; ?>&from_module=<?php echo $module;?>" class="btn btn-info btn-sm"><i class="fa-solid fa-key"></i> Reset</a>
                                            </div>
                                        </td>
                                    </tr>
                            <?php
                                    $i++;
                                }
                            } else {
                                echo "<tr><td colspan=\"5\" class=\"text-center\"><h2 class=\"text-danger\">ยังไม่มีข้อมูล</h2></td></tr>";
                            }
                            ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>