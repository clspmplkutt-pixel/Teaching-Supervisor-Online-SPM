<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ตัวชี้วัด";
$tbl = "tbl_policy_items";
?>
<div class="row">

    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-info card-outline">
            <div class="card-body">
                <div class="row">
                    <div class="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                        <a class="btn btn-block btn-info" href="?module=<?php echo $module; ?>_add&policy_id=<?php echo $policy_id; ?>"><i class="fa-solid fa-user-plus"></i> เพิ่มตัวชี้วัด</a>
                    </div>
                    <div class="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                        <select class="form-control form-select-lg select2bs4" name="academic_id" id="academic_id" onchange="location.href = this.value;" required>
                            <option value="?module=<?php echo $module; ?>">วิทยฐานะ</option>

                            <?php
                            $data = $database->select(
                                "tbl_system_Academic_Standing",
                                "*",
                                [
                                    "OR" => [
                                        "academic_id" => 99,
                                        "academic_id[<>]" => [15, 18],


                                    ],
                                    "ORDER" => ["academic_id" => "ASC"]
                                ]
                            );
                            foreach ($data as $row) {
                                if ($academic_id == $row['academic_id']) {
                                    $select_2 = "selected";
                                } else {
                                    $select_2 = "";
                                }
                                echo "<option value=\"?module=" . $module . "&academic_id=" . $row['academic_id'] . "&policy_side=$policy_side&policy_id=$policy_number\"$select_2>" . $row['academic_standing'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>


                    <div class="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                        <select class="form-control form-select-lg select2bs4" name="school_id" id="school_id" onchange="location.href = this.value;" required>
                            <option value="?module=<?php echo $module; ?>">ด้านที่</option>
                            <?php
                            $data = $database->select("tbl_policy_side", "*", ["ORDER" => ["no_id" => "ASC"]]);
                            foreach ($data as $row) {
                                if ($policy_side == $row['id']) {
                                    $select_2 = "selected";
                                } else {
                                    $select_2 = "";
                                }
                                echo "<option value=\"?module=" . $module . "&academic_id=$academic_id&policy_side=" . $row['id'] . "&policy_id=$policy_number\"$select_2>ด้านที่ " . $row["no_id"] . " " . $row['text'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>
                    <div class="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                        <select class="form-control form-select-lg select2bs4" name="school_id" id="school_id" onchange="location.href = this.value;" required>
                            <option value="?module=<?php echo $module; ?>">ตัวชี้วัด</option>
                            <?php
                            $query_data = array();
                            if ($academic_id != "") {
                                $query_data["academic"] = $academic_id;
                            }
                            if ($policy_side != "") {
                                $query_data["side"] = $policy_side;
                            }
                            $data = $database->select(
                                "tbl_policy_number",
                                "*",
                                [
                                    "AND" => $query_data,
                                    "ORDER" => ["no_order" => "ASC"]
                                ]
                            );
                            foreach ($data as $row) {
                                if ($policy_id == $row['auto_id']) {
                                    $select_2 = "selected";
                                } else {
                                    $select_2 = "";
                                }
                                echo "<option value=\"?module=" . $module . "&academic_id=$academic_id&policy_side=$policy_side&policy_id=" . $row['auto_id'] . "\"$select_2>" . $row['text'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>



                </div>
            </div>
        </div>
    </div>



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
                                <th>ตัวชี้วัดที่</th>
                                <th>ลำดับที่การแสดง</th>
                                <th>รายละเอียด</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $result = $database->select(
                                $tbl,
                                "*",
                                [
                                    "AND" =>
                                    [
                                        "policy_id" => $policy_id,
                                    ],
                                    "ORDER" =>
                                    [
                                        "id" => "ASC"
                                    ]
                                ]
                            );
                            foreach ($result as $row) {

                            ?>
                                <tr>
                                    <td class="text-center"><?php echo $row["id"]; ?></td>
                                    <td class="text-center"><?php echo $row["policy_id"]; ?></td>
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