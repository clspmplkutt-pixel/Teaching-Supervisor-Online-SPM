<?php
$title_page = "หนัาหลัก";
$tbl_teacher = "tbl_Users";
?>
<div class="row">
    <div class="col-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title">ข้อมูลครู/บุคลากรทางการศึกษา</h3>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-bordered table-hover table-striped" id="data">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>ชื่อ-นามสกุล</th>
                                <th>ประเภทตำแหน่งบุคลากร</th>
                                <th>ประเภทตำแหน่งบุคลากร</th>
                                <th>วิทยฐานะ</th>
                                <th>กลุ่มสาระ</th>
                                <th>หัวหน้ากลุ่มสาระ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $rows = $database->select(
                                $tbl_teacher,
                                "*",
                                [
                                    "school" => $_SESSION['school_code'],
                                    "ORDER" => [
                                        "position_id"=>"DESC",
                                        "teach_subject" => "ASC",
                                        "academic_id"=>"DESC"

                                        ]
                                ]
                            );
                            $i = 1;
                            foreach ($rows as $data) {
                                echo "<tr>";
                                echo "<td class=\"text-center\">$i</td>";
                                echo "<td>" . $arrayPrefix[$data['prefix']] . $data['name'] . "  " . $data['lastname'] . "</td>";
                                echo "<td>" . $arrayPerson_type[$data['persontype_id']] . "</td>";
                                echo "<td>" . $arrayPerson_position[$data['position_id']] . "</td>";
                                echo "<td>" . $arrayAcademic_Standing[$data['academic_id']] . "</td>";
                                echo "<td>" . $arrayTeach_Subject[$data['teach_subject']] . "</td>";
                                if ($data['headDepartment'] == "1") {
                                    echo "<td><i class=\"fa-solid fa-circle-check text-success\"></i></td>";
                                } else {
                                    echo "<td></td>";
                                }
                                echo "</tr>";
                                $i++;
                            }
                            ?>

                        </tbody>

                    </table>
                </div>
            </div>
        </div>

    </div>

</div>