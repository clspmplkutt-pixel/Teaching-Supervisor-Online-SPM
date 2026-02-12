<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "จัดการประเภทตัวชี้วัด";
$tbl = "tbl_type_indicators";
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
                                <th>รหัสประเภท</th>
                                <th>ประเภทตัวชี้วัด</th>
                                <!-- <th>ใช้งาน</th> -->
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
                                        "id" => "ASC",
                                    ]
                                ]
                            );
                            foreach ($result as $row) {

                            ?>
                                <tr>
                                    <td class="text-center"><?php echo $row["id"]; ?></td>
                                    <td class="text-center"><?php echo $row["indicator_id"]; ?></td>
                                    <td><?php echo $row["indicator_name"]; ?></td>
                                    <!-- <td class="text-center">
                                        <?php echo $active_icon; ?>
                                    </td> -->
                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>