<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "จัดการกลุ่มสาระการเรียนรู้";
$tbl = "tbl_system_Teach_Subject";
?>
<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page; ?></h3>

            </div>
            <div class="card-body">
                <div class=" table-responsive">
                    <table class="table table-bordered table-hover table-striped" id="data">
                        <thead>
                            <tr>
                                <th>id</th>
                                <th>รหัส</th>
                                <th>กลุ่มสาระ</th>
                                <th>กลุ่มสาระ (ย่อ)</th>
                                <th>กลุ่มสาระ (ตัวอักษรย่อ)</th>
                                <th>ใช้งาน</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $result = $database->select(
                                $tbl,
                                "*",
                                [
                                    "ORDER" =>
                                    [
                                        "teach_subject_status" => "DESC",
                                        "id" => "ASC"
                                    ]
                                ]
                            );
                            foreach ($result as $row) {
                                if ($row['teach_subject_status'] == "1") {
                                    $active_icon = "<a href=\"#\" onclick='set_TeachSubject(".$row["id"].",0)'><i class=\"fa-solid fa-circle-check text-success fa-xl\"></i></a>";
                                } else if ($row['teach_subject_status'] == "0") {
                                    $active_icon = "<a href=\"#\" onclick='set_TeachSubject(".$row["id"].",1)'><i class=\"fa-solid fa-circle-xmark text-danger fa-xl\"></i></a>";
                                }
                            ?>
                                <tr>
                                    <td class="text-center"><?php echo $row["id"]; ?></td>
                                    <td class="text-center"><?php echo $row["teach_subject_id"]; ?></td>
                                    <td><?php echo $row["teach_subject"]; ?></td>
                                    <td><?php echo $row["teach_subject_1"]; ?></td>
                                    <td><?php echo $row["teach_subject_short"]; ?></td>
                                    <td class="text-center">
                                        <?php echo $active_icon; ?>
                                    </td>
                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>