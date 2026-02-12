<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ทักษะในศตวรรษที่ 21";
$tbl = "tbl_ability21";
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
                                <th>รหัสทักษะ</th>
                                <th>ชื่อทักษะไทย</th>
                                <th>ชื่อทักษะอังกฤษ</th>
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
                                    <td class="text-center"><?php echo $row["ability21_id"]; ?></td>
                                    <td><?php echo $row["ability21_name_th"]; ?></td>
                                    <td><?php echo $row["ability21_name_en"]; ?></td>

                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>