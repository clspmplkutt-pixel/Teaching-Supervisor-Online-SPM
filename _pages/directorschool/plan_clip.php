<?php
$title_page = "คลิปการสอน";
$plan = "tbl_sendplan";
$tbl_User = "tbl_Users";
$data = $database->get($plan, "*");
$data_teacher = $database->get($tbl_User, "*", ["people_id" => $data['people_id']]);
?>
<div class="row">
    <div class="col-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title">คลิปการสอน</h3>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-6">
                        <strong>ชื่อ-นามสกุล : </strong><?php echo $arrayPrefix[$data_teacher['prefix']] .  $data_teacher['name'] . " " . $data_teacher['lastname']; ?><br>
                        <strong>กลุ่มสาระ : </strong><?php echo $arrayTeach_Subject[$data['teach_subject_id']]; ?><br>
                        <strong>ระดับชั้น : </strong><?php echo $database->get("tbl_system_GradeLevel","grade_level_name",["grade_level_id"=>$data['grade_level_id']]); ?><br>
                        <strong>ปีการศึกษา : </strong><?php echo $data['edu_year'] . "/" . $data['edu_term']; ?><br>
                        <strong>ชื่อวิชา : </strong><?php echo $data['subject_name']; ?><br>
                        <strong>เรื่องที่สอน : </strong><?php echo $data['subject_content']; ?><br>
                    </div>
                    <div class="col-6">
                        <iframe width="560" height="315" src="https://www.youtube.com/embed/<?php echo $data['plan_clip']; ?>" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                    </div>
                </div>
            </div>
        </div>

    </div>

</div>