const formLogin = document.querySelector(".form-login");
const btnLogin = document.querySelector(".btn-login");
const radioWrap = document.querySelector(".radio");

if (radioWrap) {
  radioWrap.style.display = "none";
}

if (formLogin) {
  formLogin.addEventListener("submit", async function (e) {
    e.preventDefault();

    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      AppUtils.toast("Preencha e-mail e senha antes de prosseguir.", "warning");
      return;
    }

    if (!window.appDb?.auth || !window.AppAuth?.completeLogin) {
      AppUtils.toast("Autenticacao indisponivel no momento.", "error");
      return;
    }

    btnLogin?.setAttribute("disabled", "disabled");

    try {
      await window.appDb.auth.signIn(email, password);
      const profile = await window.AppAuth.completeLogin();

      if (!profile) {
        throw new Error("Perfil do usuario nao encontrado.");
      }

      if (window.AppUtils?.logAudit && window.appDb) {
        await AppUtils.logAudit({
          entity_type: "auth",
          entity_id: email,
          action: "login",
          details: [
            { field: "perfil", before: "", after: profile.perfil }
          ]
        });
      }

      AppUtils.toast(`Login realizado com sucesso como ${profile.perfil}.`, "success");
      window.setTimeout(() => {
        window.location.href = "home.html";
      }, 350);
    } catch (error) {
      console.error(error);
      AppUtils.toast("Nao foi possivel entrar. Verifique suas credenciais e o perfil do usuario no Supabase.", "error", 4200);
    } finally {
      btnLogin?.removeAttribute("disabled");
    }
  });
}

if (btnLogin) {
  btnLogin.addEventListener("click", function () {
    formLogin.requestSubmit();
  });
}
