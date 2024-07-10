# 하늘인편 코드

해당 프로젝트는 Conroller, Service, Respository로 구성됩니다.

bean폴더에서 모든 의존성을 관리하고, DI를 통해 의존성을 주입받으며,

DI를 사용하지 않는 함수들에서는 bean에 접근해서 객체를 가져옵니다.

``` typescript
const {userService} = bean;
```

해당 코드는 유저가 로그인하고, 편지를 작성하고, 편지 전송이 실패했을 때의 상황을 담고 있습니다.

```
src
├── bean
├── lib
│ └── time
├── repository
│ ├── post
│ ├── postQueue
│ ├── user
│ └── userQueue
├── service
│ ├── mail
│ ├── retry
│ ├── rokafClient
│ └── user
└── type
```