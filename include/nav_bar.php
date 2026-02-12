<!-- Navbar -->
<nav class="main-header navbar navbar-expand navbar-white navbar-light">
  <!-- Left navbar links -->
  <ul class="navbar-nav">
    <li class="nav-item">
      <a class="nav-link" data-widget="pushmenu" href="#" role="button"><i class="fas fa-bars"></i></a>
    </li>
    <li class="nav-item d-none d-sm-inline-block">
      <a href="./" class="nav-link text-blue"><i class="fa-solid fa-house"></i> หนัาหลัก

      </a>
    </li>
    <li class="nav-item d-none d-sm-inline-block">
      <a href="#" class="nav-link text-cyan"><i class="fa-solid fa-envelope"></i> ติดต่อเรา</a>
    </li>
  </ul>
  <?php echo thai_date_full(date("Y-m-j")); ?> | <span class="text-blue"><?php echo $_SESSION['name']; ?> (<?php echo $database->get("tbl_TypeUser", "TypeUser_detail", ["TypeUser" => $_SESSION['level_id']]); ?>)</span>


  <!-- Right navbar links -->
  <ul class="navbar-nav ml-auto">


    <!-- Messages Dropdown Menu -->
    <!-- <li class="nav-item dropdown">
          <a class="nav-link" data-toggle="dropdown" href="#">
            <i class="far fa-comments"></i>
            <span class="badge badge-danger navbar-badge">3</span>
          </a>
          
        </li> -->


    <!-- Notifications Dropdown Menu -->
    <!-- <li class="nav-item dropdown">
          <a class="nav-link" data-toggle="dropdown" href="#">
            <i class="far fa-bell"></i>
            <span class="badge badge-warning navbar-badge">15</span>
          </a>
        </li> -->

    <li class="nav-item">
      <a class="nav-link" data-widget="fullscreen" href="#" role="button">
        <i class="fas fa-expand-arrows-alt"></i>
      </a>
    </li>

    <li class="nav-item">
      <a class="nav-link" data-widget="exit" href="logout.php" role="button">
        <i class="fa-solid fa-arrow-right-from-bracket text-danger"></i>
      </a>
    </li>
  </ul>
</nav>
<!-- /.navbar -->