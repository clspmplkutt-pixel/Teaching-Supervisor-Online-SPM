<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "จัดการระดับวิทยฐานะ/ตำแหน่งทางวิชาการ";
$tbl = "tbl_system_Academic_Standing";
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
                                <th>ระดับวิทยะฐานะ/ตำแหน่งทางวิชาการ</th>
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
                                        "academic_status" => "DESC",
                                        "id" => "ASC"
                                    ]
                                ]
                            );
                            foreach ($result as $row) {
                                if ($row['academic_status'] == "1") {
                                    $active_icon = "<a href=\"#\" onclick='set_AcademicStanding(".$row["id"].",0)'><i class=\"fa-solid fa-circle-check text-success fa-xl\"></i></a>";
                                } else if ($row['academic_status'] == "0") {
                                    $active_icon = "<a href=\"#\" onclick='set_AcademicStanding(".$row["id"].",1)'><i class=\"fa-solid fa-circle-xmark text-danger fa-xl\"></i></a>";
                                }
                            ?>
                                <tr>
                                    <td class="text-center"><?php echo $row["id"]; ?></td>
                                    <td class="text-center"><?php echo $row["academic_id"]; ?></td>
                                    <td><?php echo $row["academic_standing"]; ?></td>
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