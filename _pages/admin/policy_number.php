<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ตัวชี้วัดการประเมิน";
$tbl = "tbl_policy_number";
?>
<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page; ?></h3>

            </div>
            <div class="card-body">
                <div class=" table-responsive">
                    <table class="table table-bordered table-hover table-striped" id="data" data-page-length="12">
                        <thead>
                            <tr>
                                <th>id</th>
                                <th>วิทยฐานะ</th>
                                <th>ด้านที่</th>
                                <th>ข้อที่</th>
                                <th>รายละเอียด</th>
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
                                        "auto_id" => "ASC"
                                    ]
                                ]
                            );
                            foreach ($result as $row) {

                            ?>
                                <tr>
                                    <td class="text-center"><?php echo $row["auto_id"]; ?></td>
                                    <td class="text-center"><?php echo $arrayAcademic_Standing[$row["academic"]]; ?></td>
                                    <td class="text-center"><?php echo $row["side"]; ?></td>
                                    <td class="text-center"><?php echo $row["no_order"]; ?></td>
                                    <td><?php echo $row["text"]; ?></td>

                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>