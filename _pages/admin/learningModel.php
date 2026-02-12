<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "รูปแบบการจัดการเรียนรู้";
$tbl = "tbl_learningModel";
?>
<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-info card-outline">
            <div class="card-body">
                <div class="row">

                    <div class="col-sm-12 col-md-4 col-xl-4 col-lg-4 mx-auto">

                        <a class="btn btn-block btn-info" href="?module=learningModel_add">เพิ่ม<?php echo $title_page; ?></a>
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
                    <table class="table table-bordered table-hover table-striped" id="data" data-page-length='50'>
                        <thead>
                            <tr>
                                <th>id</th>
                                <th>รหัสรูปแบบ</th>
                                <th>รูปแบบการจัดการเรียนรู้</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php

                            $result = $database->select($tbl, "*", ["model_status"=>"1"],["ORDER" => ["model_id" => "ASC", "id" => "ASC"]]);
                            foreach ($result as $row) {

                            ?>
                                <tr>
                                    <td class="text-center"><?php echo $row["id"]; ?></td>
                                    <td class="text-center"><?php echo $row["model_id"]; ?></td>
                                    <td><?php echo $row["model_name"]; ?></td>
                                    <td>
                                        <div class="btn-group">
                                            <a href="?module=learningModel_edit&model_id=<?php echo $row["model_id"]; ?>" class="btn btn-warning">แก้ไข</a>
                                            <!-- <a href="" class="btn btn-danger">ลบ</a> -->
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