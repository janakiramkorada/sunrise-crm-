package com.sunrise.crm;

import org.springframework.http.HttpMethod;

import jakarta.servlet.FilterChain;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import jakarta.persistence.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.boot.*;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.security.authentication.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.stereotype.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.stream.*;

import static org.springframework.security.config.Customizer.withDefaults;


@SpringBootApplication
public class CrmApplication {

    public static void main(String[] args) {
        SpringApplication.run(CrmApplication.class, args);
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    CommandLineRunner seed(
            UserRepo users,
            ProjectRepo projects,
            TowerRepo towers,
            FloorRepo floors,
            UnitRepo units,
            LeadRepo leads,
            PasswordEncoder encoder) {

        return a -> {

            if (users.count() == 0) {
                for (var u : List.of(
                        new User("System Admin", "admin@sunrise.local", Role.ADMIN),
                        new User("Operations Manager", "manager@sunrise.local", Role.MANAGER),
                        new User("Priya Sharma", "priya@sunrise.local", Role.EMPLOYEE),
                        new User("Arjun Reddy", "arjun@sunrise.local", Role.EMPLOYEE),
                        new User("Rahul Kumar", "rahul@sunrise.local", Role.EMPLOYEE))) {

                    u.passwordHash = encoder.encode("ChangeMe!123");
                    users.save(u);
                }
            }

            if (projects.count() == 0) {

                var p = projects.save(
                        new Project(
                                "Sunrise Residency",
                                "Premium apartments near the tech corridor",
                                "Madhapur",
                                "Hyderabad",
                                "Telangana",
                                ProjectType.APARTMENT,
                                ProjectStatus.ACTIVE));

                var t = towers.save(
                        new Tower(
                                p,
                                "Tower A",
                                3,
                                "East-facing residential block",
                                "ACTIVE"));

                for (int i = 1; i <= 3; i++) {
                    floors.save(new Floor(t, i));
                }

                var fs = floors.findByTowerIdOrderByFloorNumber(t.id);

                int n = 101;

                for (Floor f : fs) {
                    for (int i = 0; i < 3; i++) {

                        UnitStatus s =
                                UnitStatus.values()[(n - 101) % 4];

                        units.save(
                                new Unit(
                                        p,
                                        t,
                                        f,
                                        "A-" + n++,
                                        PropertyType.APARTMENT,
                                        i == 2 ? 3 : 2,
                                        2,
                                        new BigDecimal(i == 2 ? "1450" : "1120"),
                                        "East",
                                        new BigDecimal(i == 2 ? "7800000" : "6500000"),
                                        new BigDecimal(i == 2 ? "8000000" : "6700000"),
                                        s));
                    }
                }
            }

            if (leads.count() == 0) {
                var project = projects.findAll().stream().findFirst().orElse(null);
                var priya = users.findByEmail("priya@sunrise.local").orElse(null);
                var arjun = users.findByEmail("arjun@sunrise.local").orElse(null);

                var l1 = new Lead(
                        "Ravi Kumar",
                        "9876543210",
                        "ravi@example.com",
                        "WEBSITE",
                        "Interested in 2 BHK in Tower A");
                l1.status = LeadStatus.QUALIFIED;
                l1.project = project;
                l1.assignedTo = priya;

                var l2 = new Lead(
                        "Anita Sharma",
                        "9123456780",
                        "anita@example.com",
                        "WHATSAPP",
                        "Requested weekend site visit");
                l2.status = LeadStatus.SITE_VISIT;
                l2.project = project;
                l2.assignedTo = arjun;

                var l3 = new Lead(
                        "Vikram Singh",
                        "9988776655",
                        "vikram@example.com",
                        "REFERRAL",
                        "Negotiating for 3 BHK");
                l3.status = LeadStatus.NEGOTIATION;
                l3.project = project;
                l3.assignedTo = priya;

                var l4 = new Lead(
                        "Meera Reddy",
                        "9000011111",
                        "meera@example.com",
                        "WALK_IN",
                        "Ready for booking");
                l4.status = LeadStatus.BOOKED;
                l4.project = project;
                l4.assignedTo = arjun;

                leads.saveAll(List.of(l1, l2, l3, l4));
            }
        };
    }
}


enum Role {
    ADMIN,
    MANAGER,
    EMPLOYEE
}

enum ProjectType {
    APARTMENT,
    VILLA,
    PLOT,
    MIXED
}

enum ProjectStatus {
    PLANNED,
    ACTIVE,
    COMPLETED,
    ON_HOLD
}

enum PropertyType {
    APARTMENT,
    VILLA,
    PLOT
}

enum UnitStatus {
    AVAILABLE,
    BLOCKED,
    BOOKED,
    SOLD
}

enum LeadStatus {
    NEW,
    CONTACTED,
    QUALIFIED,
    SITE_VISIT,
    NEGOTIATION,
    BOOKED,
    LOST
}


@Entity
@Table(name = "users")
class User {

    @Id
    UUID id = UUID.randomUUID();

    String name;

    @Column(unique = true)
    String email;

    @Column(name = "password_hash")
    String passwordHash;

    @Enumerated(EnumType.STRING)
    Role role;

    boolean active = true;

    @Column(name = "created_at")
    Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    Instant updatedAt = Instant.now();

    User() {
    }

    User(String n, String e, Role r) {
        name = n;
        email = e;
        role = r;
    }
}


@Entity
@Table(name = "projects")
class Project {

    @Id
    UUID id = UUID.randomUUID();

    @Column(unique = true)
    String name;

    String description;
    String location;
    String city;
    String state;

    @Enumerated(EnumType.STRING)
    @Column(name = "project_type")
    ProjectType projectType;

    @Enumerated(EnumType.STRING)
    ProjectStatus status;

    @Column(name = "start_date")
    LocalDate startDate;

    @Column(name = "expected_completion_date")
    LocalDate expectedCompletionDate;

    @Column(name = "created_at")
    Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    Instant updatedAt = Instant.now();

    Project() {
    }

    Project(
            String n,
            String d,
            String l,
            String c,
            String s,
            ProjectType t,
            ProjectStatus st) {

        name = n;
        description = d;
        location = l;
        city = c;
        state = s;
        projectType = t;
        status = st;
    }
}


@Entity
@Table(name = "towers")
class Tower {

    @Id
    UUID id = UUID.randomUUID();

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id")
    Project project;

    String name;
    String description;
    String status;

    @Column(name = "number_of_floors")
    int numberOfFloors;

    @Column(name = "created_at")
    Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    Instant updatedAt = Instant.now();

    Tower() {
    }

    Tower(
            Project p,
            String n,
            int f,
            String d,
            String s) {

        project = p;
        name = n;
        numberOfFloors = f;
        description = d;
        status = s;
    }
}


@Entity
@Table(name = "floors")
class Floor {

    @Id
    UUID id = UUID.randomUUID();

    @ManyToOne(optional = false)
    @JoinColumn(name = "tower_id")
    Tower tower;

    @Column(name = "floor_number")
    int floorNumber;

    @Column(name = "created_at")
    Instant createdAt = Instant.now();

    Floor() {
    }

    Floor(Tower t, int n) {
        tower = t;
        floorNumber = n;
    }
}


@Entity
@Table(name = "units")
class Unit {

    @Id
    UUID id = UUID.randomUUID();

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id")
    Project project;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tower_id")
    Tower tower;

    @ManyToOne(optional = false)
    @JoinColumn(name = "floor_id")
    Floor floor;

    @Column(name = "unit_number")
    String unitNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "property_type")
    PropertyType propertyType;

    int bedrooms;
    int bathrooms;

    BigDecimal area;

    String facing;

    @Column(name = "base_price")
    BigDecimal basePrice;

    @Column(name = "current_price")
    BigDecimal currentPrice;

    @Enumerated(EnumType.STRING)
    UnitStatus status;

    @Column(name = "created_at")
    Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    Instant updatedAt = Instant.now();

    Unit() {
    }

    Unit(
            Project p,
            Tower t,
            Floor f,
            String no,
            PropertyType pt,
            int bed,
            int bath,
            BigDecimal ar,
            String fa,
            BigDecimal bp,
            BigDecimal cp,
            UnitStatus s) {

        project = p;
        tower = t;
        floor = f;
        unitNumber = no;
        propertyType = pt;
        bedrooms = bed;
        bathrooms = bath;
        area = ar;
        facing = fa;
        basePrice = bp;
        currentPrice = cp;
        status = s;
    }
}


@Entity
@Table(name = "leads")
class Lead {

    @Id
    UUID id = UUID.randomUUID();

    @NotBlank
    String name;

    @NotBlank
    String phone;

    String email;

    String source;

    String notes;

    @Column(columnDefinition = "TEXT")
    String address;

    String city;
    String state;

    @Column(name = "pincode")
    String pincode;

    @Enumerated(EnumType.STRING)
    LeadStatus status = LeadStatus.NEW;

    @ManyToOne
    @JoinColumn(name = "project_id")
    Project project;

    @ManyToOne
    @JoinColumn(name = "assigned_to")
    User assignedTo;

    @Column(name = "created_at")
    Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    Instant updatedAt = Instant.now();

    Lead() {}

    Lead(String n, String ph, String em, String src, String note) {
        name = n;
        phone = ph;
        email = em;
        source = src;
        notes = note;
    }
}


interface UserRepo
        extends org.springframework.data.jpa.repository.JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);
}


interface LeadRepo
        extends org.springframework.data.jpa.repository.JpaRepository<Lead, UUID> {
    List<Lead> findByAssignedToId(UUID userId);
    List<Lead> findByProjectId(UUID projectId);
}


interface ProjectRepo
        extends org.springframework.data.jpa.repository.JpaRepository<Project, UUID>,
        org.springframework.data.jpa.repository.JpaSpecificationExecutor<Project> {
}


interface TowerRepo
        extends org.springframework.data.jpa.repository.JpaRepository<Tower, UUID> {

    List<Tower> findByProjectId(UUID id);
}


interface FloorRepo
        extends org.springframework.data.jpa.repository.JpaRepository<Floor, UUID> {

    List<Floor> findByTowerIdOrderByFloorNumber(UUID id);
}


interface UnitRepo
        extends org.springframework.data.jpa.repository.JpaRepository<Unit, UUID>,
        org.springframework.data.jpa.repository.JpaSpecificationExecutor<Unit> {
}


record LoginRequest(
        @Email String email,
        @NotBlank String password) {
}


record LoginResponse(
        String token,
        String name,
        Role role) {
}


@RestController
@RequestMapping("/api/auth")
class AuthController {

    final UserRepo users;
    final PasswordEncoder encoder;
    final JwtService jwt;

    AuthController(
            UserRepo u,
            PasswordEncoder e,
            JwtService j) {

        users = u;
        encoder = e;
        jwt = j;
    }

    @PostMapping("/login")
    LoginResponse login(
            @Valid @RequestBody LoginRequest r) {

        var u = users.findByEmail(r.email())
                .filter(x ->
                        x.active &&
                        encoder.matches(r.password(), x.passwordHash))
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Invalid email or password"));

        return new LoginResponse(
                jwt.create(u),
                u.name,
                u.role);
    }
}


@Service
class JwtService {

    @org.springframework.beans.factory.annotation.Value("${app.jwt.secret}")
    String secret;

    @org.springframework.beans.factory.annotation.Value("${app.jwt.expiration-ms}")
    long expiry;

    String create(User u) {

        return Jwts.builder()
                .subject(u.email)
                .claim("role", u.role.name())
                .expiration(
                        Date.from(
                                Instant.now().plusMillis(expiry)))
                .signWith(
                        Keys.hmacShaKeyFor(
                                secret.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }

    Authentication parse(String token) {

        var c =
                Jwts.parser()
                        .verifyWith(
                                Keys.hmacShaKeyFor(
                                        secret.getBytes(StandardCharsets.UTF_8)))
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();

        return new UsernamePasswordAuthenticationToken(
                c.getSubject(),
                null,
                List.of(
                        new SimpleGrantedAuthority(
                                "ROLE_" +
                                c.get("role", String.class))));
    }
}


@Component
class JwtFilter extends OncePerRequestFilter {

    final JwtService jwt;

    JwtFilter(JwtService j) {
        jwt = j;
    }

    protected void doFilterInternal(
            jakarta.servlet.http.HttpServletRequest r,
            jakarta.servlet.http.HttpServletResponse s,
            FilterChain c)
            throws jakarta.servlet.ServletException, IOException {

        var h = r.getHeader("Authorization");

        if (h != null && h.startsWith("Bearer ")) {
            try {
                SecurityContextHolder
                        .getContext()
                        .setAuthentication(
                                jwt.parse(h.substring(7)));

            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        c.doFilter(r, s);
    }
}


@Configuration
@EnableMethodSecurity
class SecurityConfig {

    final JwtFilter filter;

    SecurityConfig(JwtFilter f) {
        filter = f;
    }

    @Bean
    SecurityFilterChain security(HttpSecurity h) throws Exception {

        return h
                .csrf(c -> c.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .httpBasic(b -> b.disable())
                .formLogin(f -> f.disable())
                .logout(l -> l.disable())
                .sessionManagement(
                        s -> s.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/health").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((request, response, authException) ->
                                response.sendError(HttpStatus.UNAUTHORIZED.value(), "Unauthorized")))
                .addFilterBefore(
                        filter,
                        UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration c = new CorsConfiguration();

        c.setAllowedOriginPatterns(List.of(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "https://sunrise-crm-one.vercel.app"
        ));

        c.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
        ));

        c.setAllowedHeaders(List.of("*"));
        c.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource s =
                new UrlBasedCorsConfigurationSource();

        s.registerCorsConfiguration("/**", c);

        return s;
    }
}


record LeadRequest(
        @NotBlank String name,
        @NotBlank String phone,
        String email,
        String source,
        LeadStatus status,
        UUID projectId,
        UUID assignedToId,
        String address,
        String city,
        String state,
        String pincode,
        String notes) {
}

record ProjectRequest(
        @NotBlank @Size(max = 160) String name,
        String description,
        @NotBlank String location,
        @NotBlank String city,
        @NotBlank String state,
        @NotNull ProjectType projectType,
        @NotNull ProjectStatus status,
        LocalDate startDate,
        LocalDate expectedCompletionDate) {
}


record TowerRequest(
        @NotBlank String name,
        @Min(1) int numberOfFloors,
        String description,
        @NotBlank String status) {
}


record FloorRequest(
        @Min(0) int floorNumber) {
}


record UnitRequest(
        @NotNull UUID projectId,
        @NotNull UUID towerId,
        @NotNull UUID floorId,
        @NotBlank String unitNumber,
        @NotNull PropertyType propertyType,
        @Min(0) int bedrooms,
        @Min(0) int bathrooms,
        @NotNull @DecimalMin("0.01") BigDecimal area,
        String facing,
        @NotNull @DecimalMin("0") BigDecimal basePrice,
        @NotNull @DecimalMin("0") BigDecimal currentPrice,
        @NotNull UnitStatus status) {
}


@RestController
@RequestMapping("/api")
class CrmController {

    final ProjectRepo projects;
    final TowerRepo towers;
    final FloorRepo floors;
    final UnitRepo units;
    final UserRepo users;
    final LeadRepo leads;

    CrmController(
            ProjectRepo p,
            TowerRepo t,
            FloorRepo f,
            UnitRepo u,
            UserRepo r,
            LeadRepo l) {

        projects = p;
        towers = t;
        floors = f;
        units = u;
        users = r;
        leads = l;
    }

    
    
             
    

    @GetMapping("/users")
    List<Map<String, Object>> users() {
        return users.findAll()
                .stream()
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.id);
                    m.put("name", u.name);
                    m.put("email", u.email);
                    m.put("role", u.role);
                    m.put("active", u.active);
                    m.put("createdAt", u.createdAt);
                    m.put("updatedAt", u.updatedAt);
                    return m;
                })
                .toList();
    }

    @GetMapping("/dashboard")
    Map<String, Object> dashboard() {
        var allUsers = users.findAll();
        var allUnits = units.findAll();
        var inventory = new LinkedHashMap<String, Long>();

        for (var status : UnitStatus.values()) {
            inventory.put(
                    status.name().toLowerCase(),
                    allUnits.stream()
                            .filter(u -> u.status == status)
                            .count());
        }

        var out = new LinkedHashMap<String, Object>();
        out.put("users", (long) allUsers.size());
        out.put("managers", allUsers.stream()
                .filter(u -> u.role == Role.MANAGER)
                .count());
        out.put("employees", allUsers.stream()
                .filter(u -> u.role == Role.EMPLOYEE)
                .count());
        out.put("projects", projects.count());
        out.put("units", units.count());
        out.put("inventory", inventory);
        return out;
    }

    @GetMapping("/employees/{id}")
    Map<String, Object> employee(@PathVariable UUID id) {
        var u = get(users, id, "Employee");
        if (u.role != Role.EMPLOYEE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found");
        }

        var assigned = leads.findByAssignedToId(id);
        var m = new LinkedHashMap<String, Object>();
        m.put("id", u.id);
        m.put("name", u.name);
        m.put("email", u.email);
        m.put("role", u.role);
        m.put("active", u.active);
        m.put("createdAt", u.createdAt);
        m.put("updatedAt", u.updatedAt);
        m.put("leadCount", assigned.size());
        m.put("bookedLeads", assigned.stream().filter(l -> l.status == LeadStatus.BOOKED).count());
        return m;
    }

    @GetMapping("/employees")
    List<Map<String, Object>> employees() {
        return users.findAll()
                .stream()
                .filter(u -> u.role == Role.EMPLOYEE)
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.id);
                    m.put("name", u.name);
                    m.put("email", u.email);
                    m.put("role", u.role);
                    m.put("active", u.active);
                    return m;
                })
                .toList();
    }

    @GetMapping("/projects")
    List<Map<String, Object>> listProjects(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) ProjectStatus status,
            @RequestParam(required = false) ProjectType type) {

        return projects.findAll()
                .stream()
                .filter(p ->
                        q == null ||
                        p.name.toLowerCase()
                                .contains(q.toLowerCase()))
                .filter(p ->
                        status == null ||
                        p.status == status)
                .filter(p ->
                        type == null ||
                        p.projectType == type)
                .map(this::project)
                .toList();
    }

    @GetMapping("/projects/{id}")
    Map<String, Object> getProject(
            @PathVariable UUID id) {

        var p = get(projects, id, "Project");

        var out = project(p);

        var ts = towers.findByProjectId(id);

        out.put("towers", ts.size());

        out.put(
                "floors",
                ts.stream()
                        .mapToLong(
                                t -> floors
                                        .findByTowerIdOrderByFloorNumber(t.id)
                                        .size())
                        .sum());

        out.put("inventory", summary(id));

        return out;
    }

    @PostMapping("/projects")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasRole('ADMIN')")
    Map<String, Object> createProject(
            @Valid @RequestBody ProjectRequest r) {

        return project(
                projects.save(
                        from(r, new Project())));
    }

    @PutMapping("/projects/{id}")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasRole('ADMIN')")
    Map<String, Object> updateProject(
            @PathVariable UUID id,
            @Valid @RequestBody ProjectRequest r) {

        return project(
                projects.save(
                        from(
                                r,
                                get(projects, id, "Project"))));
    }

    @DeleteMapping("/projects/{id}")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteProject(
            @PathVariable UUID id) {

        projects.delete(
                get(projects, id, "Project"));
    }

    @GetMapping("/projects/{id}/towers")
    List<Map<String, Object>> listTowers(
            @PathVariable UUID id) {

        get(projects, id, "Project");

        return towers.findByProjectId(id)
                .stream()
                .map(this::tower)
                .toList();
    }

    @PostMapping("/projects/{id}/towers")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasRole('ADMIN')")
    Map<String, Object> createTower(
            @PathVariable UUID id,
            @Valid @RequestBody TowerRequest r) {

        return tower(
                towers.save(
                        from(
                                r,
                                new Tower(
                                        get(projects, id, "Project"),
                                        r.name(),
                                        r.numberOfFloors(),
                                        r.description(),
                                        r.status()))));
    }

    @PutMapping("/towers/{id}")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasRole('ADMIN')")
    Map<String, Object> updateTower(
            @PathVariable UUID id,
            @Valid @RequestBody TowerRequest r) {

        return tower(
                towers.save(
                        from(
                                r,
                                get(towers, id, "Tower"))));
    }

    @DeleteMapping("/towers/{id}")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteTower(
            @PathVariable UUID id) {

        towers.delete(
                get(towers, id, "Tower"));
    }

    @GetMapping("/towers/{id}/floors")
    List<Map<String, Object>> listFloors(
            @PathVariable UUID id) {

        get(towers, id, "Tower");

        return floors
                .findByTowerIdOrderByFloorNumber(id)
                .stream()
                .map(this::floor)
                .toList();
    }

    @PostMapping("/towers/{id}/floors")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasRole('ADMIN')")
    Map<String, Object> createFloor(
            @PathVariable UUID id,
            @Valid @RequestBody FloorRequest r) {

        return floor(
                floors.save(
                        new Floor(
                                get(towers, id, "Tower"),
                                r.floorNumber())));
    }

    @PutMapping("/floors/{id}")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasRole('ADMIN')")
    Map<String, Object> updateFloor(
            @PathVariable UUID id,
            @Valid @RequestBody FloorRequest r) {

        var f = get(floors, id, "Floor");

        f.floorNumber = r.floorNumber();

        return floor(
                floors.save(f));
    }

    @DeleteMapping("/floors/{id}")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteFloor(
            @PathVariable UUID id) {

        floors.delete(
                get(floors, id, "Floor"));
    }

    @GetMapping("/units")
    List<Map<String, Object>> listUnits() {

        return units.findAll()
                .stream()
                .map(this::unit)
                .toList();
    }

    @GetMapping("/units/{id}")
    Map<String, Object> getUnit(
            @PathVariable UUID id) {

        return unit(
                get(units, id, "Unit"));
    }

    @PostMapping("/units")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasRole('ADMIN')")
    Map<String, Object> createUnit(
            @Valid @RequestBody UnitRequest r) {

        return unit(
                units.save(
                        from(
                                r,
                                new Unit())));
    }

    @PutMapping("/units/{id}")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasRole('ADMIN')")
    Map<String, Object> updateUnit(
            @PathVariable UUID id,
            @Valid @RequestBody UnitRequest r) {

        return unit(
                units.save(
                        from(
                                r,
                                get(units, id, "Unit"))));
    }

    @PatchMapping("/units/{id}/status")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasAnyRole('ADMIN','MANAGER')")
    Map<String, Object> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {

        var u = get(units, id, "Unit");

        try {
            u.status =
                    UnitStatus.valueOf(
                            body.getOrDefault(
                                    "status",
                                    ""));
        } catch (IllegalArgumentException e) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid unit status");
        }

        u.updatedAt = Instant.now();

        return unit(
                units.save(u));
    }

    @PostMapping("/units/{id}/status")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasAnyRole('ADMIN','MANAGER')")
    Map<String, Object> updateStatusPost(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {

        return updateStatus(id, body);
    }

    @DeleteMapping("/units/{id}")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteUnit(
            @PathVariable UUID id) {

        units.delete(
                get(units, id, "Unit"));
    }

    @GetMapping("/inventory")
    List<Map<String, Object>> inventory(
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) UUID towerId,
            @RequestParam(required = false) UUID floorId,
            @RequestParam(required = false) UnitStatus status,
            @RequestParam(required = false) PropertyType propertyType,
            @RequestParam(required = false) Integer bedrooms,
            @RequestParam(required = false) String q) {

        return units.findAll()
                .stream()
                .filter(u ->
                        projectId == null ||
                        u.project.id.equals(projectId))
                .filter(u ->
                        towerId == null ||
                        u.tower.id.equals(towerId))
                .filter(u ->
                        floorId == null ||
                        u.floor.id.equals(floorId))
                .filter(u ->
                        status == null ||
                        u.status == status)
                .filter(u ->
                        propertyType == null ||
                        u.propertyType == propertyType)
                .filter(u ->
                        bedrooms == null ||
                        u.bedrooms == bedrooms)
                .filter(u ->
                        q == null ||
                        u.unitNumber
                                .toLowerCase()
                                .contains(q.toLowerCase()))
                .map(this::unit)
                .toList();
    }

    @GetMapping("/leads")
    List<Map<String, Object>> listLeads(
            @RequestParam(required = false) LeadStatus status,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) UUID assignedToId,
            @RequestParam(required = false) String q) {

        return leads.findAll()
                .stream()
                .filter(l -> status == null || l.status == status)
                .filter(l -> projectId == null ||
                        (l.project != null && l.project.id.equals(projectId)))
                .filter(l -> assignedToId == null ||
                        (l.assignedTo != null && l.assignedTo.id.equals(assignedToId)))
                .filter(l -> q == null ||
                        l.name.toLowerCase().contains(q.toLowerCase()) ||
                        l.phone.toLowerCase().contains(q.toLowerCase()) ||
                        (l.email != null && l.email.toLowerCase().contains(q.toLowerCase())) ||
                        (l.address != null && l.address.toLowerCase().contains(q.toLowerCase())) ||
                        (l.city != null && l.city.toLowerCase().contains(q.toLowerCase())) ||
                        (l.pincode != null && l.pincode.toLowerCase().contains(q.toLowerCase())))
                .sorted(Comparator.comparing((Lead l) -> l.createdAt).reversed())
                .map(this::lead)
                .toList();
    }

    @GetMapping("/leads/{id}")
    Map<String, Object> getLead(@PathVariable UUID id) {
        return lead(get(leads, id, "Lead"));
    }

    @PostMapping("/leads")
    Map<String, Object> createLead(@Valid @RequestBody LeadRequest r) {
        var l = new Lead(r.name(), r.phone(), r.email(), r.source(), r.notes());
        return lead(leads.save(from(r, l)));
    }

    @PutMapping("/leads/{id}")
    Map<String, Object> updateLead(
            @PathVariable UUID id,
            @Valid @RequestBody LeadRequest r) {
        return lead(leads.save(from(r, get(leads, id, "Lead"))));
    }

    @PatchMapping("/leads/{id}/status")
    Map<String, Object> updateLeadStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {

        var l = get(leads, id, "Lead");

        try {
            l.status = LeadStatus.valueOf(
                    body.getOrDefault("status", ""));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid lead status");
        }

        l.updatedAt = Instant.now();
        return lead(leads.save(l));
    }

    @DeleteMapping("/leads/{id}")
    @org.springframework.security.access.prepost.PreAuthorize(
            "hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteLead(@PathVariable UUID id) {
        leads.delete(get(leads, id, "Lead"));
    }

    @GetMapping("/reports/overview")
    Map<String, Object> reportsOverview() {

        var all = leads.findAll();

        var statusCounts = new LinkedHashMap<String, Long>();
        for (var s : LeadStatus.values()) {
            statusCounts.put(
                    s.name().toLowerCase(),
                    all.stream().filter(l -> l.status == s).count());
        }

        var sourceCounts = all.stream()
                .filter(l -> l.source != null && !l.source.isBlank())
                .collect(java.util.stream.Collectors.groupingBy(
                        l -> l.source,
                        LinkedHashMap::new,
                        java.util.stream.Collectors.counting()));

        var employeePerformance = users.findAll()
                .stream()
                .filter(u -> u.role == Role.EMPLOYEE || u.role == Role.MANAGER)
                .map(u -> {
                    var assigned = all.stream()
                            .filter(l -> l.assignedTo != null &&
                                    l.assignedTo.id.equals(u.id))
                            .toList();
                    var booked = assigned.stream()
                            .filter(l -> l.status == LeadStatus.BOOKED)
                            .count();
                    return Map.<String, Object>of(
                            "userId", u.id,
                            "name", u.name,
                            "role", u.role,
                            "totalLeads", (long) assigned.size(),
                            "bookedLeads", booked,
                            "conversionRate",
                            assigned.isEmpty() ? 0.0 :
                                    Math.round((booked * 10000.0 / assigned.size())) / 100.0);
                })
                .sorted(Comparator.comparing(
                        (Map<String, Object> m) ->
                                ((Number) m.get("totalLeads")).longValue())
                        .reversed())
                .toList();

        var visits = all.stream()
                .filter(l -> l.status == LeadStatus.SITE_VISIT)
                .count();

        return new LinkedHashMap<>(Map.of(
                "totalLeads", (long) all.size(),
                "statusCounts", statusCounts,
                "sourceCounts", sourceCounts,
                "siteVisitLeads", visits,
                "bookedLeads",
                all.stream().filter(l -> l.status == LeadStatus.BOOKED).count(),
                "lostLeads",
                all.stream().filter(l -> l.status == LeadStatus.LOST).count(),
                "employeePerformance", employeePerformance));
    }


    Project from(
            ProjectRequest r,
            Project p) {

        p.name = r.name();
        p.description = r.description();
        p.location = r.location();
        p.city = r.city();
        p.state = r.state();
        p.projectType = r.projectType();
        p.status = r.status();
        p.startDate = r.startDate();
        p.expectedCompletionDate =
                r.expectedCompletionDate();
        p.updatedAt = Instant.now();

        return p;
    }

    Tower from(
            TowerRequest r,
            Tower t) {

        t.name = r.name();
        t.numberOfFloors = r.numberOfFloors();
        t.description = r.description();
        t.status = r.status();
        t.updatedAt = Instant.now();

        return t;
    }

    Unit from(
            UnitRequest r,
            Unit u) {

        var p =
                get(projects, r.projectId(), "Project");

        var t =
                get(towers, r.towerId(), "Tower");

        var f =
                get(floors, r.floorId(), "Floor");

        if (!t.project.id.equals(p.id) ||
                !f.tower.id.equals(t.id)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Project, tower, and floor must form a valid hierarchy");
        }

        u.project = p;
        u.tower = t;
        u.floor = f;
        u.unitNumber = r.unitNumber();
        u.propertyType = r.propertyType();
        u.bedrooms = r.bedrooms();
        u.bathrooms = r.bathrooms();
        u.area = r.area();
        u.facing = r.facing();
        u.basePrice = r.basePrice();
        u.currentPrice = r.currentPrice();
        u.status = r.status();
        u.updatedAt = Instant.now();

        return u;
    }

    Lead from(LeadRequest r, Lead l) {
        l.name = r.name();
        l.phone = r.phone();
        l.email = r.email();
        l.source = r.source();
        l.address = r.address();
        l.city = r.city();
        l.state = r.state();
        l.pincode = r.pincode();
        l.notes = r.notes();
        l.status = r.status() == null ? LeadStatus.NEW : r.status();

        l.project = r.projectId() == null
                ? null
                : get(projects, r.projectId(), "Project");

        l.assignedTo = r.assignedToId() == null
                ? null
                : get(users, r.assignedToId(), "User");

        l.updatedAt = Instant.now();
        return l;
    }

    Map<String, Object> lead(Lead l) {
        var m = new LinkedHashMap<String, Object>();

        m.put("id", l.id);
        m.put("name", l.name);
        m.put("phone", l.phone);
        m.put("email", Optional.ofNullable(l.email).orElse(""));
        m.put("source", Optional.ofNullable(l.source).orElse(""));
        m.put("address", Optional.ofNullable(l.address).orElse(""));
        m.put("city", Optional.ofNullable(l.city).orElse(""));
        m.put("state", Optional.ofNullable(l.state).orElse(""));
        m.put("pincode", Optional.ofNullable(l.pincode).orElse(""));
        m.put("notes", Optional.ofNullable(l.notes).orElse(""));
        m.put("status", l.status);
        m.put("projectId", l.project == null ? null : l.project.id);
        m.put("project", l.project == null ? "" : l.project.name);
        m.put("assignedToId", l.assignedTo == null ? null : l.assignedTo.id);
        m.put("assignedTo", l.assignedTo == null ? "" : l.assignedTo.name);
        m.put("createdAt", l.createdAt);
        m.put("updatedAt", l.updatedAt);

        return m;
    }

    Map<String, Object> project(Project p) {

        return new LinkedHashMap<>(
                Map.of(
                        "id", p.id,
                        "name", p.name,
                        "description",
                        Optional.ofNullable(
                                p.description)
                                .orElse(""),
                        "location", p.location,
                        "city", p.city,
                        "state", p.state,
                        "projectType", p.projectType,
                        "status", p.status));
    }

    Map<String, Object> tower(Tower t) {

        return Map.of(
                "id", t.id,
                "projectId", t.project.id,
                "name", t.name,
                "numberOfFloors",
                t.numberOfFloors,
                "description",
                Optional.ofNullable(
                        t.description)
                        .orElse(""),
                "status", t.status);
    }

    Map<String, Object> floor(Floor f) {

        return Map.of(
                "id", f.id,
                "towerId", f.tower.id,
                "floorNumber",
                f.floorNumber);
    }

    Map<String, Object> unit(Unit u) {

        Map<String, Object> m =
                new LinkedHashMap<>();

        m.put("id", u.id);
        m.put("projectId", u.project.id);
        m.put("project", u.project.name);
        m.put("towerId", u.tower.id);
        m.put("tower", u.tower.name);
        m.put("floorId", u.floor.id);
        m.put("floor", u.floor.floorNumber);
        m.put("unitNumber", u.unitNumber);
        m.put("propertyType", u.propertyType);
        m.put("bedrooms", u.bedrooms);
        m.put("bathrooms", u.bathrooms);
        m.put("area", u.area);
        m.put(
                "facing",
                Optional.ofNullable(u.facing)
                        .orElse(""));
        m.put("basePrice", u.basePrice);
        m.put("currentPrice", u.currentPrice);
        // Backward-compatible alias for dashboard views that still read `price`.
        m.put("price", u.currentPrice != null ? u.currentPrice : u.basePrice);
        m.put("status", u.status);

        return m;
    }

    Map<String, Long> summary(UUID p) {

        var all =
                units.findAll()
                        .stream()
                        .filter(u ->
                                p == null ||
                                u.project.id.equals(p))
                        .toList();

        var x =
                new LinkedHashMap<String, Long>();

        x.put(
                "total",
                (long) all.size());

        for (var s : UnitStatus.values()) {

            x.put(
                    s.name().toLowerCase(),
                    all.stream()
                            .filter(u ->
                                    u.status == s)
                            .count());
        }

        return x;
    }

    <T> T get(
            org.springframework.data.jpa.repository.JpaRepository<T, UUID> r,
            UUID id,
            String name) {

        return r.findById(id)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        name + " not found"));
    }
}


@RestControllerAdvice
class Errors {

    @ExceptionHandler({
            DataIntegrityViolationException.class
    })
    ResponseEntity<Map<String, String>> conflict() {

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(
                        Map.of(
                                "message",
                                "That record conflicts with existing data."));
    }

    @ExceptionHandler({
            org.springframework.web.bind.MethodArgumentNotValidException.class
    })
    ResponseEntity<Map<String, String>> validation() {

        return ResponseEntity
                .badRequest()
                .body(
                        Map.of(
                                "message",
                                "Please correct the highlighted fields."));
    }
}


@RestController
@RequestMapping("/api")
class HealthController {

    @GetMapping("/health")
    Map<String, String> health() {

        return Map.of(
                "status",
                "UP");
    }
}




