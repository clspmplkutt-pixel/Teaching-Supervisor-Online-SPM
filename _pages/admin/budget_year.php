<?php
$title_page = "จัดการปีงบประมาณ";
$tbl="tbl_budget_year";
?>
<script src="<?php echo $path_include; ?>/app.js"></script>

<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> จัดการปีงบประมาณ</h3>

            </div>
            <div class="card-body">
                <div class=" table-responsive">
                    <table class="table table-bordered table-hover table-striped" id="data">
                        <thead>
                            <tr>
                                <th>ปีงบประมาณ</th>
                                <th>ปีปัจจุบัน</th>
                                <th>วันเริ่มปีงบประมาณ</th>
                                <th>วันสิ้นสุดปีงบประมาณ</th>
                                <th>Operator</th>
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
                                        "year" => "ASC",
                                    ]
                                ]
                            );
                            foreach ($result as $row) {
                                if ($row["active"]) {
                                    $active = " class='bg-warning'";
                                    $active_icon = "<i class='fa-solid fa-circle-check fa-lg text-success'></i>";
                                } else {
                                    $active = "";
                                    $active_icon = "<i class='fa-solid fa-circle-xmark fa-lg text-danger'></i>";
                                }
                            ?>
                                <tr <?php echo $active; ?>>
                                    <td class="text-center"><?php echo $row["year"]; ?></td>
                                    <td class="text-center"><?php echo $active_icon; ?></td>
                                    <td class="text-center"><?php echo thai_date_full($row["date_start"], "2");?></td>
                                    <td class="text-center"><?php echo thai_date_full($row["date_end"], "2"); ?></td>
                                    <td>
                                        <div class="btn-group">
                                            <?php
                                            if ($row["active"]) {

                                            } else {
                                            ?>
                                                <a href="#" onclick='set_year("<?php echo $row["year"]; ?>")' class="btn btn-sm btn-primary">
                                                    <i class="fa-regular fa-pen-to-square"></i>
                                                    ปีปัจจุบัน
                                                <?php } ?>
                                                </a>
                                        </div>
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