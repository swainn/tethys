$(function() {
  // custom field separator
  var bgColor = $(".header-wrapper").css("background-color");
  $("div[class$='_permissions']").prepend(
    `<div style="
      background-color:${bgColor};
      display:block;
      position:relative;
      top:0;
      left:0;
      width:100%;
      z-index:1;
      height:40px;
      border-radius:4px;
      margin:10px 0 10px 0;">
    </div>`);

  // hide custom permission and group multiselect fields
  hideAllCustomMFs();

  // create an observer on the apps field to trigger visualization of custom fields
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.target == $(".field-apps .selector-chosen")[0]) {
        showChosenMFs();
        hideOtherMFs();
      }
    })
  })

  observer.observe($(".field-apps")[0], {
    childList: true,
    subtree: true,
  })

  // show chosen custom fields
  showChosenMFs();
});

function hideAllCustomMFs() {
  $(".form-row").each(function (mFIx, mF) {
    if (!$(mF).is(".field-name, .field-apps, .field-permissions")) {
      $(mF).hide();
      $(`.selector-available select[name$='_permissions_old']`).prop("disabled", true);
      $(`.selector-available select[name$='_groups_old']`).prop("disabled", true);
    };

    if ($(mF).is(".field-apps, div[class$='_groups']")) {
      $(mF).css({"border-bottom": "0"});
    };
  });
};

function showChosenMFs() {
  $(".field-apps .selector-chosen select option").each(function (initAppsIx, initApps) {
    var initApp = $(initApps).text().replace(" ", "_").toLowerCase();
    $($(`.field-${initApp}_permissions`).children()[0]).html(`<h4 style="color: white;">${$(initApps).text()}</h4>`);

    $(".form-row").each(function (hiddenMFIx, hiddenMF) {
      if ($(hiddenMF).hasClass(`field-${initApp}_permissions`) || $(hiddenMF).hasClass(`field-${initApp}_groups`)) {
        $(hiddenMF).show();
        $(`.field-${initApp}_permissions .selector-available select`).prop("disabled", false);
        $(`.field-${initApp}_groups .selector-available select`).prop("disabled", false);
      };
    });
  });
};

function hideOtherMFs() {
  $(".field-apps .selector-available select option").each(function (otherAppsIx, otherApps) {
    var otherApp = $(otherApps).text().replace(" ", "_").toLowerCase();

    $(".form-row").each(function (visibleMFIx, visibleMF) {
      if ($(visibleMF).hasClass(`field-${otherApp}_permissions`) || $(visibleMF).hasClass(`field-${otherApp}_groups`)) {
        $(visibleMF).hide();
        $(`.field-${otherApp}_permissions .selector-available select`).prop("disabled", true);
        $(`.field-${otherApp}_groups .selector-available select`).prop("disabled", true);
      };
    });
  });
};
