<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "การเข้าใช้งานระบบ";
$tbl = "tbl_log";
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
                                <th>ผู้ใช้งาน</th>
                                <th>IP Address</th>
                                <th>เวลาเข้าใช้งาน</th>
                                <th>ระดับผู้เข้าใช้</th>
                                <th>เบาว์เซอร์</th>
                                <th>ความละเอียดจอ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $result = $database->select(
                                $tbl,
                                "*",
                                [
                                    "LIMIT" => [0,100],
                                    "ORDER" =>
                                    [
                                        "id" => "DESC",
                                    ]
                                ]
                            );
                            foreach ($result as $row) {

                            ?>
                                <tr>
                                    <td class="text-center"><?php echo $row["id"]; ?></td>
                                    <td class="text-center"><?php echo $row["user"]; ?></td>
                                    <td class="text-center"><?php echo $row["ipaddress"]; ?></td>
                                    <td class="text-center"><?php echo $row["datetimein"]; ?></td>
                                    <td class="text-center"><?php echo $row["level"]; ?></td>
                                    <td><?php echo $row["browser_name_regex"]; ?></td>
                                    <td><?php echo $row["screenresolution"]; ?></td>
                                    

                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>