from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required


def login_page(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)   # SESIÓN, no JWT
            return redirect("/dashboard/")
        else:
            return render(request, "trackbuild/login.html", {
                "error": "Credenciales inválidas"
            })

    return render(request, "trackbuild/login.html")


@login_required
def dashboard(request):
    return render(request, "trackbuild/dashboard.html")


@login_required
def logout_view(request):
    logout(request)
    return redirect("/login/")
