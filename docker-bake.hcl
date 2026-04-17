group "default" {
  targets = ["api"]
}

target "api" {
  context = "."
  dockerfile = "Dockerfile"
  target = "development"
  tags = ["ec-backend-app:dev"]
}

target "api-prod" {
  context = "."
  dockerfile = "Dockerfile"
  target = "production"
  tags = ["ec-backend-app:latest"]
}
